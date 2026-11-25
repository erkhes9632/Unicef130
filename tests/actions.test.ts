/**
 * Server Action tests: role checks run on the server regardless of the UI, account actions keep
 * their guards (self / last admin / typed confirmation), and the application lifecycle works
 * end to end (submit → one per period → approve → member; reject; change of decision).
 * Clerk and D1 are faked; the actions' own logic is what runs.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";

type Role = "admin" | "member" | null;
type Me = {
  id: string;
  email: string;
  name: string;
  role: Role;
  twoFactorEnabled: boolean;
  applyBlocked: boolean;
};
let me: Me | null = null;
const signInAs = (role: Role, extra: Partial<Me> = {}) => {
  me = {
    id: "me",
    email: "me@gmail.com",
    name: "Me",
    role,
    twoFactorEnabled: false,
    applyBlocked: false,
    ...extra,
  };
};

class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden") {
    super(code);
  }
}
mock.module("@/lib/auth/session", () => ({
  AuthError,
  getCurrentUser: async () => me,
  refreshUserFromClerk: async () => null,
  requireAdmin: async () => me,
  requireMember: async () => me,
  assertSignedIn: async () => {
    if (!me) throw new AuthError("unauthenticated");
    return me;
  },
  assertMember: async () => {
    if (!me) throw new AuthError("unauthenticated");
    if (!me.role) throw new AuthError("forbidden");
    return me;
  },
  assertAdmin: async () => {
    if (!me) throw new AuthError("unauthenticated");
    if (me.role !== "admin") throw new AuthError("forbidden");
    return me;
  },
}));

/** Clerk writes and account clean-up, recorded in call order. */
const clerkLog: string[] = [];
let adminCount = 2;
mock.module("@/lib/users/clerk-admin", () => ({
  setRole: async (_db: unknown, id: string, role: Role) => void clerkLog.push(`role:${id}:${role}`),
  setBanned: async (_db: unknown, id: string, banned: boolean) =>
    void clerkLog.push(`ban:${id}:${banned}`),
  deleteClerkUser: async (id: string) => void clerkLog.push(`clerk-delete:${id}`),
  countActiveAdmins: async () => adminCount,
}));
mock.module("@/lib/users/delete", () => ({
  removeUserData: async (_db: unknown, id: string, actor: { id: string } | null) =>
    void clerkLog.push(`remove:${id}:${actor?.id ?? "none"}`),
}));
const accounts = new Map<
  string,
  { id: string; email: string; role: Role; banned: boolean; name: string }
>();
mock.module("@/lib/users/sync", () => ({
  findUser: async (_db: unknown, id: string) => accounts.get(id) ?? null,
  upsertUser: async () => null,
  mirrorFromClerk: () => null,
}));

let turnstileOk = true;
const dbCalls: string[] = [];
let insertedValues: unknown = null;
const valuesLog: unknown[] = [];
const setLog: unknown[] = [];
/** Results for the next awaited queries (first in, first out); an Error rejects. */
const queuedResults: unknown[] = [];

/** Chainable fake Drizzle client: records method names; awaits to the next queued result. */
function chain(root = false): unknown {
  const target = () => {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        // The root client must not be thenable (async getDb() would unwrap it).
        if (root) return undefined;
        if (queuedResults.length > 0) {
          const next = queuedResults.shift();
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            next instanceof Error ? reject(next) : resolve(next);
        }
        return (resolve: (v: unknown) => void) =>
          resolve([{ id: "new-id", createdAt: new Date(), n: 0 }]);
      }
      return (...args: unknown[]) => {
        dbCalls.push(String(prop));
        if (prop === "values") {
          insertedValues = args[0];
          valuesLog.push(args[0]);
        }
        if (prop === "set") setLog.push(args[0]);
        return chain();
      };
    },
  });
}
mock.module("@/db", () => ({ getDb: async () => chain(true), createDb: () => chain(true) }));
mock.module("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
mock.module("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  },
  notFound: () => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  },
}));
mock.module("next/headers", () => ({
  headers: async () => new Headers({ "cf-connecting-ip": "127.0.0.1" }),
}));
mock.module("@/lib/integrations/turnstile", () => ({
  verifyTurnstile: async () => (turnstileOk ? "ok" : "failed"),
  getTurnstileSiteKey: async () => "test",
}));
mock.module("@/lib/applications/sheets-sync", () => ({
  syncApplicationToSheets: async () => "skipped",
  runInBackground: async (p: Promise<unknown>) => void (await p),
  isSheetsConfigured: async () => false,
}));

type Period = {
  id: string;
  opensAt: Date;
  closesAt: Date;
  capacity: number | null;
  whenFull: "close" | "waitlist";
  classes: string[];
  questions: never[];
};
const openPeriod = (): Period => ({
  id: "p1",
  opensAt: new Date(Date.now() - 3_600_000),
  closesAt: new Date(Date.now() + 3_600_000),
  capacity: null,
  whenFull: "waitlist",
  classes: ["10А", "10Б"],
  questions: [],
});
let periods: Period[] = [];
let taken = 0;
let rateAllowed = true;
const rateKeys: string[] = [];
mock.module("@/lib/recruitment/data", () => ({
  listPeriods: async () => periods,
  countTaken: async () => taken,
}));
mock.module("@/lib/rate-limit", () => ({
  consumeRateLimit: async (key: string) => {
    rateKeys.push(key);
    return { allowed: rateAllowed, count: 1, retryAfterSec: 0 };
  },
  hashIp: async () => "iphash",
}));
mock.module("@/lib/admin/activity", () => ({
  logActivity: async () => {},
  diffFields: () => undefined,
  shortId: (id: string) => id.slice(0, 8),
}));
mock.module("@/lib/media/server", () => ({
  deleteMediaUrls: async () => {},
  isOwnMediaUrl: () => true,
}));

const { saveSettings } = await import("@/app/admin/(panel)/settings/actions");
const { setApplicationStatus, saveDecisionMessage, setApplyBlocked } =
  await import("@/app/admin/(panel)/applications/actions");
const { changeUserRole, setUserBanned, deleteUserAccount, linkAccountToMember } =
  await import("@/app/admin/(panel)/users/actions");
const { deleteNews } = await import("@/app/admin/(panel)/news/actions");
const { markAttendance } = await import("@/app/admin/(panel)/events/actions");
const { addHours } = await import("@/app/admin/(panel)/hours/actions");
const { submitJoinApplication, submitContactMessage } = await import("@/app/actions/forms");
const { deleteMyAccount, signUpForEvent, cancelSignup } = await import("@/app/[locale]/me/actions");

beforeEach(() => {
  me = null;
  dbCalls.length = 0;
  queuedResults.length = 0;
  insertedValues = null;
  valuesLog.length = 0;
  setLog.length = 0;
  clerkLog.length = 0;
  rateKeys.length = 0;
  accounts.clear();
  adminCount = 2;
  turnstileOk = true;
  periods = [openPeriod()];
  taken = 0;
  rateAllowed = true;
});

const settingsForm = () => {
  const f = new FormData();
  f.set("contact.address", "Хаяг");
  f.set("club.foundedYear", "2025");
  f.set("membership.rejectedRetentionDays", "90");
  f.set("helpOptions", JSON.stringify([{ key: "events", label: "Арга хэмжээ", labelEn: "" }]));
  return f;
};

describe("admin action guards", () => {
  test("signed out: every admin action refuses before touching the database", async () => {
    expect((await saveSettings({}, settingsForm())).message).toBe("Дахин нэвтэрнэ үү.");
    expect((await setApplicationStatus("a1", "accepted")).message).toBe("Дахин нэвтэрнэ үү.");
    expect((await changeUserRole("u1", "make-admin")).message).toBe("Дахин нэвтэрнэ үү.");
    expect((await deleteNews("n1")).ok).toBe(false);
    expect(dbCalls).toEqual([]);
    expect(clerkLog).toEqual([]);
  });

  test("members and applicants are forbidden from admin actions", async () => {
    for (const role of ["member", null] as const) {
      signInAs(role);
      const forbidden = "Танд энэ үйлдлийг хийх эрх байхгүй.";
      expect((await saveSettings({}, settingsForm())).message).toBe(forbidden);
      expect((await setApplicationStatus("a1", "accepted")).message).toBe(forbidden);
      expect((await setUserBanned("u1", true)).message).toBe(forbidden);
      expect((await deleteUserAccount("u1", "x@y.mn")).message).toBe(forbidden);
      expect((await setApplyBlocked("u1", true)).message).toBe(forbidden);
    }
    expect(dbCalls).toEqual([]);
    expect(clerkLog).toEqual([]);
  });

  test("admin can save settings; malformed list JSON is rejected (nothing wiped)", async () => {
    signInAs("admin");
    expect((await saveSettings({}, settingsForm())).ok).toBe(true);
    dbCalls.length = 0;
    const f = settingsForm();
    f.set("partners", "{not json");
    expect((await saveSettings({}, f)).ok).toBe(false);
    expect(dbCalls).not.toContain("insert");
  });

  test("invalid status is rejected before the database", async () => {
    signInAs("admin");
    expect((await setApplicationStatus("a1", "spam")).ok).toBe(false);
    expect(dbCalls).toEqual([]);
  });
});

describe("account management", () => {
  const account = (id: string, role: Role, email = `${id}@gmail.com`) =>
    accounts.set(id, { id, role, email, banned: false, name: "Батын Анужин" });

  test("an admin can't demote, ban or delete themselves", async () => {
    signInAs("admin");
    account("me", "admin", "me@gmail.com");
    for (const res of [
      await changeUserRole("me", "remove-role"),
      await changeUserRole("me", "make-member"),
      await setUserBanned("me", true),
      await deleteUserAccount("me", "me@gmail.com"),
    ])
      expect(res).toEqual({
        ok: false,
        message: "Өөрийн бүртгэл дээр энэ үйлдлийг хийх боломжгүй.",
      });
    expect(clerkLog).toEqual([]);
  });

  test("the last admin can't be demoted, banned or deleted", async () => {
    signInAs("admin");
    account("a2", "admin");
    adminCount = 1;
    for (const res of [
      await changeUserRole("a2", "remove-role"),
      await setUserBanned("a2", true),
      await deleteUserAccount("a2", "a2@gmail.com"),
    ])
      expect(res.message).toContain("Сүүлчийн админ");
    expect(clerkLog).toEqual([]);
  });

  test("make member: creates a hidden member row and sets the role in Clerk + D1", async () => {
    signInAs("admin");
    account("u1", null);
    queuedResults.push([], [], [{ id: "m-new" }]); // no linked member, no e-mail match, insert
    expect((await changeUserRole("u1", "make-member")).ok).toBe(true);
    expect(valuesLog[0]).toMatchObject({
      userId: "u1",
      showPublicly: false,
      email: "u1@gmail.com",
    });
    expect(clerkLog).toEqual(["role:u1:member"]);
  });

  test("make member never links silently: an imported member with the e-mail blocks it", async () => {
    signInAs("admin");
    account("u1", null);
    queuedResults.push([], [{ id: "imported" }]);
    const res = await changeUserRole("u1", "make-member");
    expect(res.ok).toBe(false);
    expect(res.message).toContain("Гишүүнтэй холбох");
    expect(clerkLog).toEqual([]);
  });

  test("link account → member: links the row and gives the member role", async () => {
    signInAs("admin");
    account("u1", null);
    queuedResults.push([{ id: "imp", userId: null, anonymized: false }], [], []);
    expect((await linkAccountToMember("u1", "imp")).ok).toBe(true);
    expect(setLog[0]).toMatchObject({ userId: "u1", active: true });
    expect(clerkLog).toEqual(["role:u1:member"]);
  });

  test("link refuses a member that belongs to another account", async () => {
    signInAs("admin");
    account("u1", null);
    queuedResults.push([{ id: "imp", userId: "someone-else", anonymized: false }]);
    expect((await linkAccountToMember("u1", "imp")).ok).toBe(false);
    expect(clerkLog).toEqual([]);
  });

  test("ban / unban go to Clerk and D1", async () => {
    signInAs("admin");
    account("u1", "member");
    expect((await setUserBanned("u1", true)).ok).toBe(true);
    accounts.get("u1")!.banned = true;
    expect((await setUserBanned("u1", false)).ok).toBe(true);
    expect(clerkLog).toEqual(["ban:u1:true", "ban:u1:false"]);
  });

  test("delete needs the typed e-mail; Clerk goes first, then the D1 personal data", async () => {
    signInAs("admin");
    account("u1", "member", "kid@gmail.com");
    expect((await deleteUserAccount("u1", "other@gmail.com")).ok).toBe(false);
    expect(clerkLog).toEqual([]);
    expect((await deleteUserAccount("u1", " Kid@Gmail.com ")).ok).toBe(true);
    expect(clerkLog).toEqual(["clerk-delete:u1", "remove:u1:me"]);
  });
});

describe("application lifecycle", () => {
  const join = {
    fullName: "Батын Анужин",
    className: "10 а",
    phone: "8811 2233",
    reason: "Хүүхдүүдэд туслахыг хүсэж байна.",
    helpWith: ["reading"],
    answers: {},
    consent: true,
  };
  /** settings rows → defaults; no application from this account in the period yet */
  const cleanDb = () => queuedResults.push([], []);

  test("signed-out, member and blocked accounts can't apply", async () => {
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "unauthenticated" });
    signInAs("member");
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "member" });
    signInAs(null, { applyBlocked: true });
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "blocked" });
    expect(dbCalls).toEqual([]);
  });

  test("valid → stored once with the account id and e-mail, normalized fields", async () => {
    signInAs(null, { id: "u1", email: "kid@gmail.com" });
    cleanDb();
    expect(await submitJoinApplication(join)).toEqual({ ok: true, waitlisted: false });
    expect(insertedValues).toMatchObject({
      userId: "u1",
      periodId: "p1",
      email: "kid@gmail.com",
      fullName: "Батын Анужин",
      className: "10А",
      phone: "+97688112233",
      status: "new",
    });
    expect(Object.keys(insertedValues as object).sort()).toEqual(
      [
        "answers",
        "className",
        "consentAt",
        "email",
        "fullName",
        "helpWith",
        "periodId",
        "phone",
        "reason",
        "status",
        "userId",
      ].sort(),
    );
    expect(rateKeys).toEqual(["join:user:u1"]);
  });

  test("per-account rate limit, closed period and invalid input never insert", async () => {
    signInAs(null);
    rateAllowed = false;
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "rate" });
    rateAllowed = true;
    periods = [];
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "closed" });
    periods = [openPeriod()];
    const bad = await submitJoinApplication({ ...join, phone: "1234", className: "5Б" });
    expect(bad).toMatchObject({ ok: false, error: "validation" });
    expect(dbCalls).not.toContain("insert");
  });

  test("one application per account per period (and a racing duplicate)", async () => {
    signInAs(null);
    queuedResults.push([], [{ id: "existing" }]);
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "duplicate" });
    expect(dbCalls).not.toContain("insert");
    queuedResults.push([], [], new Error("UNIQUE constraint failed: applications.user_id"));
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "duplicate" });
  });

  test("capacity: waitlist or full depending on the period", async () => {
    signInAs(null);
    periods = [{ ...openPeriod(), capacity: 1 }];
    taken = 1;
    cleanDb();
    expect(await submitJoinApplication(join)).toEqual({ ok: true, waitlisted: true });
    expect(insertedValues).toMatchObject({ status: "waitlist" });
    periods = [{ ...openPeriod(), capacity: 1, whenFull: "close" }];
    insertedValues = null;
    cleanDb();
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "full" });
    expect(insertedValues).toBeNull();
  });

  const app = (extra: Record<string, unknown> = {}) => ({
    id: "a1",
    userId: "u1",
    periodId: "p1",
    status: "new",
    memberId: null,
    fullName: "Батын Анужин",
    className: "10А",
    email: "kid@gmail.com",
    ...extra,
  });

  test("approve → member role + one hidden member row in the period's school year", async () => {
    signInAs("admin");
    queuedResults.push(
      [app()], // the application
      [], // status update
      [{ role: null }], // the applicant's account
      [], // no member linked to the account yet
      [{ schoolYear: "2026-2027" }], // the period
      [{ id: "m1" }], // insert member
      [], // link member to the application
    );
    const res = await setApplicationStatus("a1", "accepted");
    expect(res.ok).toBe(true);
    expect(valuesLog[0]).toMatchObject({
      name: "Б.Анужин",
      showPublicly: false,
      schoolYear: "2026-2027",
      userId: "u1",
    });
    expect(setLog[0]).toMatchObject({ status: "accepted", decidedBy: "me" });
    expect(clerkLog).toEqual(["role:u1:member"]);
  });

  test("approving an application that already has a member creates no second row", async () => {
    signInAs("admin");
    queuedResults.push([app({ memberId: "m1" })], [], [{ role: null }], []);
    expect((await setApplicationStatus("a1", "accepted")).ok).toBe(true);
    expect(dbCalls).not.toContain("insert");
  });

  test("changing an accepted decision takes the member role back (admins keep theirs)", async () => {
    signInAs("admin");
    queuedResults.push([app({ status: "accepted", memberId: "m1" })], [], [{ role: "member" }], []);
    expect((await setApplicationStatus("a1", "rejected")).ok).toBe(true);
    expect(clerkLog).toEqual(["role:u1:null"]);
    expect(setLog).toContainEqual({ active: false });

    clerkLog.length = 0;
    queuedResults.push([app({ status: "accepted", memberId: "m1" })], [], [{ role: "admin" }], []);
    expect((await setApplicationStatus("a1", "waitlist")).ok).toBe(true);
    expect(clerkLog).toEqual([]);
  });

  test("rejected → accepted later works (admin can change the decision)", async () => {
    signInAs("admin");
    queuedResults.push(
      [app({ status: "rejected" })],
      [],
      [{ role: null }],
      [],
      [{ schoolYear: "2026-2027" }],
      [{ id: "m1" }],
      [],
    );
    expect((await setApplicationStatus("a1", "accepted")).ok).toBe(true);
    expect(clerkLog).toEqual(["role:u1:member"]);
  });

  test("the applicant's message and the reapply block are admin-only writes", async () => {
    signInAs("admin");
    const f = new FormData();
    f.set("decisionMessage", "Дараагийн элсэлтэд хүлээж байна.");
    queuedResults.push([{ id: "a1" }]);
    expect((await saveDecisionMessage("a1", {}, f)).ok).toBe(true);
    expect(setLog[0]).toEqual({ decisionMessage: "Дараагийн элсэлтэд хүлээж байна." });
    queuedResults.push([{ id: "u1" }]);
    expect((await setApplyBlocked("u1", true)).ok).toBe(true);
    expect(setLog[1]).toMatchObject({ applyBlocked: true });
  });
});

describe("member area actions", () => {
  test("admins can't delete their own account from /me", async () => {
    signInAs("admin");
    expect(await deleteMyAccount("УСТГАХ")).toEqual({ ok: false, error: "adminSelfDelete" });
    expect(clerkLog).toEqual([]);
  });

  test("self-delete needs the confirmation word; then Clerk + D1 clean-up (no actor)", async () => {
    signInAs("member", { id: "m1" });
    expect(await deleteMyAccount("yes")).toEqual({ ok: false, error: "confirm" });
    expect(clerkLog).toEqual([]);
    expect(await deleteMyAccount(" устгах ")).toEqual({ ok: true });
    expect(clerkLog).toEqual(["clerk-delete:m1", "remove:m1:none"]);
  });

  const event = (extra: Record<string, unknown> = {}) => ({
    id: "e1",
    published: true,
    signupEnabled: true,
    signupCapacity: 1,
    signupDeadline: null,
    startsAt: new Date(Date.now() + 86_400_000),
    ...extra,
  });

  test("event sign-up: members only; full → waitlist; closed after the deadline", async () => {
    signInAs(null);
    expect(await signUpForEvent("e1")).toEqual({ ok: false, error: "forbidden" });
    signInAs("member", { id: "m1" });
    queuedResults.push([event()], [], [{ n: 1 }]);
    expect(await signUpForEvent("e1")).toEqual({ ok: true, status: "waitlist" });
    expect(insertedValues).toMatchObject({ eventId: "e1", userId: "m1", status: "waitlist" });
    queuedResults.push([event({ signupDeadline: new Date(Date.now() - 1000) })]);
    expect(await signUpForEvent("e1")).toEqual({ ok: false, error: "closed" });
  });

  test("cancelling a place moves the first waitlisted member up", async () => {
    signInAs("member", { id: "m1" });
    queuedResults.push([{ id: "s1", status: "registered" }], [], [{ id: "s2" }], []);
    expect(await cancelSignup("e1")).toEqual({ ok: true, status: "cancelled" });
    expect(setLog[0]).toMatchObject({ status: "cancelled" });
    expect(setLog[1]).toMatchObject({ status: "registered" });
  });
});

describe("attendance and the hours log", () => {
  test("admin-only; hours are validated before the database", async () => {
    signInAs("member");
    expect((await markAttendance("e1", "s1", "attended", "2")).ok).toBe(false);
    signInAs("admin");
    expect((await markAttendance("e1", "s1", "attended", "30")).message).toContain("0.25–24");
    expect((await markAttendance("e1", "s1", "dancing", "2")).message).toBe("Төлөв буруу.");
    expect(dbCalls).toEqual([]);
  });

  test("attended → one hours entry for (member, event) in the event's school year", async () => {
    signInAs("admin");
    const startsAt = new Date(Date.UTC(2026, 10, 20, 2));
    queuedResults.push(
      [{ id: "s1", userId: "u1", eventId: "e1", startsAt, schoolYear: null }], // sign-up + event
      [{ id: "m1" }], // the account's member row
      [], // status update
      [], // earlier entry removed
      [], // insert
    );
    expect((await markAttendance("e1", "s1", "attended", "2,5")).ok).toBe(true);
    expect(insertedValues).toMatchObject({
      memberId: "m1",
      eventId: "e1",
      hours: 2.5,
      schoolYear: "2026-2027",
      createdBy: "me",
    });
  });

  test("no member row → no hours (and a clear message)", async () => {
    signInAs("admin");
    queuedResults.push(
      [{ id: "s1", userId: "u1", eventId: "e1", startsAt: new Date(), schoolYear: "2026-2027" }],
      [],
    );
    const res = await markAttendance("e1", "s1", "attended", "2");
    expect(res.ok).toBe(false);
    expect(dbCalls).not.toContain("insert");
  });

  test("bulk hours need selected members and valid hours", async () => {
    signInAs("admin");
    const f = new FormData();
    f.set("hours", "2");
    f.set("date", "2026-11-20");
    f.set("schoolYear", "2026-2027");
    expect((await addHours({}, f)).message).toBe("Гишүүн сонгоно уу.");
    f.append("memberIds", "m1");
    f.append("memberIds", "m2");
    queuedResults.push([{ id: "m1" }, { id: "m2" }], []);
    expect((await addHours({}, f)).ok).toBe(true);
    expect(insertedValues).toHaveLength(2);
    f.set("hours", "0");
    expect((await addHours({}, f)).ok).toBe(false);
  });
});

describe("contact form", () => {
  const msg = {
    name: "Эцэг эх",
    email: "Parent@Example.MN",
    subject: "",
    message: "Сайн байна уу, асуулт байна.",
    turnstileToken: "t",
  };
  test("lowercases e-mail, requires Turnstile", async () => {
    expect(await submitContactMessage(msg)).toEqual({ ok: true });
    expect(insertedValues).toMatchObject({ email: "parent@example.mn" });
    turnstileOk = false;
    expect(await submitContactMessage(msg)).toEqual({ ok: false, error: "captcha" });
  });
  test("address over its limit → rate, nothing stored", async () => {
    rateAllowed = false;
    expect(await submitContactMessage(msg)).toEqual({ ok: false, error: "rate" });
    expect(dbCalls).not.toContain("insert");
  });
});
