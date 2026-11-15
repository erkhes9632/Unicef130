/**
 * Server Action guard tests: role checks run on the server regardless of the UI, and public
 * forms re-validate + verify Turnstile before touching the database.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { SQL } from "drizzle-orm";

type Role = "admin" | "editor" | "reviewer" | null;
let currentRole: Role = null;
let turnstileOk = true;
const dbCalls: string[] = [];
let insertedValues: unknown = null;
/** Every `.values()` / `.where()` argument, in call order (for multi-step actions). */
const valuesLog: unknown[] = [];
const whereLog: unknown[] = [];

class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden") {
    super(code);
  }
}

const me = () => ({
  id: "me",
  name: "Me",
  email: "me@x.mn",
  role: currentRole ?? ("reviewer" as const),
  twoFactorEnabled: true,
  sessionId: "s1",
});
// The real permission table decides; only the session lookup is faked.
const { can } = await import("@/lib/auth/roles");
mock.module("@/lib/auth/session", () => ({
  AuthError,
  getCurrentUser: async () => (currentRole ? me() : null),
  requireUser: async () => me(),
  requireSession: async () => {
    if (!currentRole) throw new AuthError("unauthenticated");
    return me();
  },
  requirePermission: async (permission: Parameters<typeof can>[1]) => {
    if (!currentRole) throw new AuthError("unauthenticated");
    if (!can(currentRole, permission)) throw new AuthError("forbidden");
    return me();
  },
}));
mock.module("@/lib/seo", () => ({ getSiteUrl: async () => "https://club.test" }));
mock.module("@/lib/integrations/email", () => ({
  isEmailConfigured: async () => false,
  sendEmail: async () => false,
}));

/** Results for the next awaited queries (first in, first out); empty → the default row. */
const queuedResults: unknown[][] = [];

/** Chainable fake Drizzle client: records method names, awaits to `[{ id: "new-id", ... }]`. */
function chain(root = false): unknown {
  const target = () => {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        // The root client must not be thenable (async getDb() would unwrap it).
        if (root) return undefined;
        if (queuedResults.length > 0) {
          const next = queuedResults.shift();
          return (resolve: (v: unknown) => void) => resolve(next);
        }
        return (resolve: (v: unknown) => void) =>
          resolve([
            {
              id: "new-id",
              createdAt: new Date(),
              fullName: "X",
              title: "T",
              n: 1,
              email: "x@y.mn",
              role: "editor",
            },
          ]);
      }
      return (...args: unknown[]) => {
        dbCalls.push(String(prop));
        if (prop === "values") {
          insertedValues = args[0];
          valuesLog.push(args[0]);
        }
        if (prop === "where") whereLog.push(args[0]);
        return chain();
      };
    },
  });
}
mock.module("@/db", () => ({ getDb: async () => chain(true), createDb: () => chain(true) }));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));
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
// Recruitment collaborators: the action's own layering is what these tests exercise.
type Period = {
  id: string;
  opensAt: Date;
  closesAt: Date;
  capacity: number | null;
  whenFull: "close" | "waitlist";
  classes: string[];
  questions: never[];
  ipLimitPer10Min: number;
  ipLimitPerDay: number;
};
const openPeriod = (): Period => ({
  id: "p1",
  opensAt: new Date(Date.now() - 3_600_000),
  closesAt: new Date(Date.now() + 3_600_000),
  capacity: null,
  whenFull: "waitlist",
  classes: ["10А", "10Б"],
  questions: [],
  ipLimitPer10Min: 1,
  ipLimitPerDay: 10,
});
let periods: Period[] = [];
let taken = 0;
let blocked = false;
let fillMs: number | null = 60_000;
let rateAllowed = true;
mock.module("@/lib/recruitment/data", () => ({
  listPeriods: async () => periods,
  countTaken: async () => taken,
  isBlocked: async () => blocked,
}));
mock.module("@/lib/recruitment/form-token", () => ({
  formAgeMs: async () => fillMs,
  hashIp: async () => "iphash",
  issueFormToken: async () => "token",
}));
mock.module("@/lib/rate-limit", () => ({
  consumeRateLimit: async () => ({ allowed: rateAllowed, count: 1, retryAfterSec: 0 }),
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
const { bulkDeleteSpam, deleteApplication, setApplicationStatus } =
  await import("@/app/admin/(panel)/applications/actions");
const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
const toSql = (where: unknown) => new SQLiteSyncDialect().sqlToQuery(where as SQL);
const { setUserRole, setUserDisabled, inviteUser, createResetLink, revokeUserSessions } =
  await import("@/app/admin/(panel)/users/actions");
const { deleteNews } = await import("@/app/admin/(panel)/news/actions");
const { submitJoinApplication, submitContactMessage } = await import("@/app/actions/forms");
const { lookupApplicationStatus } = await import("@/app/actions/join-status");

beforeEach(() => {
  dbCalls.length = 0;
  queuedResults.length = 0;
  insertedValues = null;
  valuesLog.length = 0;
  whereLog.length = 0;
  turnstileOk = true;
  periods = [openPeriod()];
  taken = 0;
  blocked = false;
  fillMs = 60_000;
  rateAllowed = true;
});

const settingsForm = () => {
  const f = new FormData();
  f.set("contact.address", "Хаяг");
  f.set("club.foundedYear", "2025");
  f.set("helpOptions", JSON.stringify([{ key: "events", label: "Арга хэмжээ", labelEn: "" }]));
  return f;
};

describe("admin action guards", () => {
  test("anonymous user cannot run any admin action", async () => {
    currentRole = null;
    expect((await saveSettings({}, settingsForm())).message).toBe("Дахин нэвтэрнэ үү.");
    expect((await deleteNews("n1")).ok).toBe(false);
    expect(dbCalls).toHaveLength(0);
  });

  test("editor is blocked from admin-only actions", async () => {
    currentRole = "editor";
    for (const res of [
      await saveSettings({}, settingsForm()),
      await deleteApplication("a1"),
      await setUserRole("u1", "admin"),
      await setUserDisabled("u1", true),
      await inviteUser({}, new FormData()),
      await createResetLink("u1"),
      await revokeUserSessions("u1"),
    ]) {
      expect(res.ok).toBe(false);
      expect(res.message).toBe("Танд энэ үйлдлийг хийх эрх байхгүй.");
    }
    expect(dbCalls).toHaveLength(0);
  });

  test("editor manages content but cannot touch applications", async () => {
    currentRole = "editor";
    expect((await deleteNews("n1")).ok).toBe(true);
    dbCalls.length = 0;
    const res = await setApplicationStatus("a1", "accepted");
    expect(res.message).toBe("Танд энэ үйлдлийг хийх эрх байхгүй.");
    expect(dbCalls).toHaveLength(0);
  });

  test("reviewer handles applications only", async () => {
    currentRole = "reviewer";
    queuedResults.push(
      [{ id: "a1" }], // exists
      [{ id: "a1", status: "new", flags: [] }], // rows before the change
      [], // status update
      [{ id: "a1", memberId: null, periodId: null, fullName: "Бат Болд", className: "10А" }],
      [{ id: "m1" }], // member insert … returning
    );
    expect((await setApplicationStatus("a1", "accepted")).ok).toBe(true);
    dbCalls.length = 0;
    for (const res of [
      await deleteNews("n1"),
      await deleteApplication("a1"),
      await saveSettings({}, settingsForm()),
    ]) {
      expect(res.message).toBe("Танд энэ үйлдлийг хийх эрх байхгүй.");
    }
    expect(dbCalls).toHaveLength(0);
  });

  test("invite returns a one-time link and stores only the token hash", async () => {
    currentRole = "admin";
    const f = new FormData();
    f.set("email", "New.Person@Example.org");
    f.set("role", "reviewer");
    const res = await inviteUser({}, f);
    // The fake DB "finds" a user for every select, so the duplicate guard answers here…
    expect(res.ok).toBe(false);
    expect(res.message).toBe("Энэ и-мэйлтэй хэрэглэгч аль хэдийн байна.");
    // …and an invalid role never reaches the database.
    dbCalls.length = 0;
    f.set("role", "owner");
    expect((await inviteUser({}, f)).ok).toBe(false);
    expect(dbCalls).toHaveLength(0);
  });

  test("invalid status is rejected before the database", async () => {
    currentRole = "reviewer";
    expect((await setApplicationStatus("a1", "hacked")).ok).toBe(false);
    expect(dbCalls).toHaveLength(0);
  });

  test("admin can save settings; cannot change own role or disable self", async () => {
    currentRole = "admin";
    expect((await saveSettings({}, settingsForm())).ok).toBe(true);
    expect((await setUserRole("me", "editor")).message).toBe("Өөрийнхөө эрхийг өөрчлөх боломжгүй.");
    expect((await setUserDisabled("me", true)).message).toBe("Өөрийгөө идэвхгүй болгох боломжгүй.");
  });
});

describe("application workflow", () => {
  test("accepted → one hidden member row named by memberDisplayName in the period's year", async () => {
    currentRole = "reviewer";
    queuedResults.push(
      [{ id: "a1" }],
      [{ id: "a1", status: "interview", flags: [] }],
      [],
      [{ id: "a1", memberId: null, periodId: "p1", fullName: "Батын Анужин", className: "10А" }],
      [{ schoolYear: "2026-2027" }],
      [{ id: "m1" }],
    );
    expect((await setApplicationStatus("a1", "accepted")).ok).toBe(true);
    expect(valuesLog).toContainEqual(
      expect.objectContaining({
        name: "Б.Анужин",
        className: "10А",
        showPublicly: false,
        showPhoto: false,
        schoolYear: "2026-2027",
      }),
    );
  });

  test("accepting again does not create a second member", async () => {
    currentRole = "admin";
    queuedResults.push(
      [{ id: "a1" }],
      [{ id: "a1", status: "waitlist", flags: [] }],
      [],
      [{ id: "a1", memberId: "m1", periodId: "p1", fullName: "Батын Анужин", className: "10А" }],
    );
    expect((await setApplicationStatus("a1", "accepted")).ok).toBe(true);
    expect(valuesLog.some((v) => (v as { name?: string }).name === "Б.Анужин")).toBe(false);
  });

  test("bulk delete removes only applications whose status is spam", async () => {
    currentRole = "admin";
    const f = new FormData();
    for (const id of ["a1", "a2", "a3"]) f.append("ids", id);
    queuedResults.push([{ id: "a2" }], [{ id: "a2" }], []);
    const res = await bulkDeleteSpam({}, f);
    expect(res).toMatchObject({ ok: true, message: "1 спам өргөдөл устгагдлаа." });
    expect(toSql(whereLog[0])).toMatchObject({
      sql: '("applications"."id" in (?, ?, ?) and "applications"."status" = ?)',
      params: ["a1", "a2", "a3", "spam"],
    });
    // The delete targets only the spam ids returned by the guarded select.
    expect(toSql(whereLog[1]).params).toEqual(["a2"]);
  });

  test("bulk delete with no spam among the selection deletes nothing", async () => {
    currentRole = "admin";
    const f = new FormData();
    f.append("ids", "a1");
    queuedResults.push([]);
    expect((await bulkDeleteSpam({}, f)).ok).toBe(false);
    expect(dbCalls).not.toContain("delete");
  });

  test("bulk delete is admin-only", async () => {
    currentRole = "reviewer";
    const f = new FormData();
    f.append("ids", "a1");
    expect((await bulkDeleteSpam({}, f)).message).toBe("Танд энэ үйлдлийг хийх эрх байхгүй.");
    expect(dbCalls).toHaveLength(0);
  });
});

describe("public form actions", () => {
  const join = {
    fullName: "Батын Анужин",
    className: "10 а",
    phone: "8811 2233",
    email: "",
    reason: "Хүүхдүүдэд туслахыг хүсэж байна.",
    helpWith: ["reading"],
    answers: {},
    consent: true,
    turnstileToken: "token",
    website: "",
    formToken: "signed",
  };
  /** settings rows → none; existing application → none; same reason → 0; same address → 0 */
  const cleanDb = () => queuedResults.push([], [], [{ n: 0 }], [{ n: 0 }]);

  test("join: valid → stored once with normalized fields, tracking code, no extra fields", async () => {
    cleanDb();
    const res = await submitJoinApplication({ ...join, isAdmin: true, status: "accepted" });
    expect(res).toMatchObject({ ok: true, waitlisted: false });
    expect(res.ok && res.trackingCode).toMatch(/^UC-[2-9A-HJKMNP-Z]{4}$/);
    expect(insertedValues).toMatchObject({
      phone: "+97688112233",
      phoneNormalized: "88112233",
      className: "10А",
      email: null,
      periodId: "p1",
      status: "new",
      ipHash: "iphash",
      spamScore: 0,
    });
    expect(insertedValues).not.toHaveProperty("isAdmin");
  });

  test("join: honeypot filled → looks like success, nothing stored", async () => {
    const res = await submitJoinApplication({ ...join, website: "http://spam.example" });
    expect(res).toEqual({ ok: true, trackingCode: null, waitlisted: false });
    expect(dbCalls).toHaveLength(0);
  });

  test("join: forged/stale form token and too-fast submissions are rejected before the DB", async () => {
    fillMs = null;
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "stale" });
    fillMs = 1_500;
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "tooFast" });
    expect(dbCalls).toHaveLength(0);
  });

  test("join: failed Turnstile → captcha error, nothing stored", async () => {
    turnstileOk = false;
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "captcha" });
    expect(dbCalls).toHaveLength(0);
  });

  test("join: no open period → closed", async () => {
    periods = [];
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "closed" });
    periods = [{ ...openPeriod(), closesAt: new Date(Date.now() - 1000) }];
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "closed" });
    expect(dbCalls).not.toContain("insert");
  });

  test("join: invalid input / class not offered / unknown help option → validation", async () => {
    for (const bad of [
      { phone: "1" },
      { consent: false },
      { className: "9В" },
      { fullName: "Anujin Bat" },
      { helpWith: ["not-offered"] },
    ]) {
      queuedResults.push([]);
      const res = await submitJoinApplication({ ...join, ...bad });
      expect(res).toMatchObject({ ok: false, error: "validation" });
    }
    expect(dbCalls).not.toContain("insert");
  });

  test("join: blocked sender and exceeded address limits get the same neutral answer", async () => {
    queuedResults.push([]);
    blocked = true;
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "rate" });
    blocked = false;
    rateAllowed = false;
    queuedResults.push([], []);
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "rate" });
    expect(dbCalls).not.toContain("insert");
  });

  test("join: same phone in the same period → duplicate, nothing stored", async () => {
    queuedResults.push([], [{ id: "existing" }]);
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "duplicate" });
    expect(dbCalls).not.toContain("insert");
  });

  test("join: capacity reached → waitlist or full depending on the period", async () => {
    periods = [{ ...openPeriod(), capacity: 30 }];
    taken = 30;
    cleanDb();
    expect(await submitJoinApplication(join)).toMatchObject({ ok: true, waitlisted: true });
    expect(insertedValues).toMatchObject({ status: "waitlist" });
    periods = [{ ...openPeriod(), capacity: 30, whenFull: "close" }];
    queuedResults.push([], []);
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "full" });
  });

  test("join: suspicious applications are stored as spam but answered like a success", async () => {
    fillMs = 5_000; // fast fill (+30)
    queuedResults.push([], [], [{ n: 3 }], [{ n: 0 }]); // same text as 3 others (+40)
    const res = await submitJoinApplication(join);
    expect(res).toMatchObject({ ok: true });
    expect(insertedValues).toMatchObject({ status: "spam", spamScore: 70 });
    expect((insertedValues as { spamFlags: string[] }).spamFlags).toEqual([
      "fast_fill",
      "repeated_text",
    ]);
  });

  test("admin settings: malformed list JSON is rejected (nothing wiped)", async () => {
    currentRole = "admin";
    const f = settingsForm();
    f.set("partners", "{not json");
    expect((await saveSettings({}, f)).ok).toBe(false);
    expect(dbCalls).not.toContain("insert");
  });

  test("contact: lowercases email, requires Turnstile", async () => {
    const msg = {
      name: "Эцэг эх",
      email: "Parent@Example.MN",
      subject: "",
      message: "Сайн байна уу, асуулт байна.",
      turnstileToken: "t",
    };
    expect(await submitContactMessage(msg)).toEqual({ ok: true });
    expect(insertedValues).toMatchObject({ email: "parent@example.mn" });
    turnstileOk = false;
    expect(await submitContactMessage(msg)).toEqual({ ok: false, error: "captcha" });
  });

  test("contact: address over its limit → rate, nothing stored", async () => {
    rateAllowed = false;
    const res = await submitContactMessage({
      name: "Эцэг эх",
      email: "parent@example.mn",
      subject: "",
      message: "Сайн байна уу, асуулт байна.",
      turnstileToken: "t",
    });
    expect(res).toEqual({ ok: false, error: "rate" });
    expect(dbCalls).not.toContain("insert");
  });
});

describe("application status lookup", () => {
  const row = {
    fullName: "Батын Анужин",
    status: "interview",
    phone: "88112233",
    createdAt: new Date("2026-11-14T03:00:00Z"),
  };
  const ask = (extra: Partial<{ code: string; last4: string; turnstileToken: string }> = {}) =>
    lookupApplicationStatus({ code: "uc-7k3m", last4: "2233", turnstileToken: "t", ...extra });

  test("code + last 4 digits → first name and public status only", async () => {
    queuedResults.push([row]);
    expect(await ask()).toEqual({
      ok: true,
      firstName: "Анужин",
      status: "interview",
      submittedAt: "2026-11-14T03:00:00.000Z",
    });
  });

  test("wrong digits and unknown code give the same answer", async () => {
    queuedResults.push([row]);
    expect(await ask({ last4: "0000" })).toEqual({ ok: false, error: "notFound" });
    queuedResults.push([]);
    expect(await ask()).toEqual({ ok: false, error: "notFound" });
  });

  test("Turnstile is required before the rate limit and the database", async () => {
    turnstileOk = false;
    expect(await ask()).toEqual({ ok: false, error: "captcha" });
    expect(dbCalls).toHaveLength(0);
  });

  test("malformed input and exceeded limit never reach the database", async () => {
    expect(await ask({ code: "hello" })).toEqual({ ok: false, error: "invalid" });
    expect(await ask({ last4: "12" })).toEqual({ ok: false, error: "invalid" });
    rateAllowed = false;
    expect(await ask()).toEqual({ ok: false, error: "rate" });
    expect(dbCalls).toHaveLength(0);
  });

  test("spam is reported as received", async () => {
    queuedResults.push([{ ...row, status: "spam" }]);
    expect(await ask()).toMatchObject({ ok: true, status: "received" });
  });
});
