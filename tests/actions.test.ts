/**
 * Server Action guard tests: role checks run on the server regardless of the UI, and public
 * forms re-validate + verify Turnstile before touching the database.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";

type Role = "admin" | "editor" | null;
let currentRole: Role = null;
let turnstileOk = true;
const dbCalls: string[] = [];
let insertedValues: unknown = null;

class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden") {
    super(code);
  }
}

mock.module("@/lib/auth/session", () => ({
  AuthError,
  getCurrentUser: async () =>
    currentRole ? { id: "me", name: "Me", email: "me@x.mn", role: currentRole } : null,
  requireUser: async () => ({
    id: "me",
    name: "Me",
    email: "me@x.mn",
    role: currentRole ?? "editor",
  }),
  requireRole: async (required: "admin" | "editor") => {
    if (!currentRole) throw new AuthError("unauthenticated");
    if (required === "admin" && currentRole !== "admin") throw new AuthError("forbidden");
    return { id: "me", name: "Me", email: "me@x.mn", role: currentRole };
  },
}));

/** Chainable fake Drizzle client: records method names, awaits to `[{ id: "new-id", ... }]`. */
function chain(root = false): unknown {
  const target = () => {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        // The root client must not be thenable (async getDb() would unwrap it).
        if (root) return undefined;
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
        if (prop === "values") insertedValues = args[0];
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
  verifyTurnstile: async () => turnstileOk,
  getTurnstileSiteKey: async () => "test",
}));
mock.module("@/lib/applications/sheets-sync", () => ({
  syncApplicationToSheets: async () => "skipped",
  runInBackground: async (p: Promise<unknown>) => void (await p),
  isSheetsConfigured: async () => false,
}));
mock.module("@/lib/admin/activity", () => ({ logActivity: async () => {} }));
mock.module("@/lib/media/server", () => ({
  deleteMediaUrls: async () => {},
  isOwnMediaUrl: () => true,
}));

const { saveSettings } = await import("@/app/admin/(panel)/settings/actions");
const { deleteApplication, setApplicationStatus } =
  await import("@/app/admin/(panel)/applications/actions");
const { setUserRole, setUserDisabled, createUser } =
  await import("@/app/admin/(panel)/users/actions");
const { deleteNews } = await import("@/app/admin/(panel)/news/actions");
const { submitJoinApplication, submitContactMessage } = await import("@/app/actions/forms");

beforeEach(() => {
  dbCalls.length = 0;
  insertedValues = null;
  turnstileOk = true;
});

const settingsForm = () => {
  const f = new FormData();
  f.set("contact.address", "Хаяг");
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
      await createUser({}, new FormData()),
    ]) {
      expect(res.ok).toBe(false);
      expect(res.message).toBe("Танд энэ үйлдлийг хийх эрх байхгүй.");
    }
    expect(dbCalls).toHaveLength(0);
  });

  test("editor can run content actions", async () => {
    currentRole = "editor";
    expect((await setApplicationStatus("a1", "accepted")).ok).toBe(true);
    expect((await deleteNews("n1")).ok).toBe(true);
  });

  test("invalid status is rejected before the database", async () => {
    currentRole = "editor";
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

describe("public form actions", () => {
  const join = {
    fullName: "Батын Анужин",
    className: "10 а",
    phone: "9911 2233",
    email: "",
    reason: "Хүүхдүүдэд туслахыг хүсэж байна.",
    helpWith: ["reading"],
    consent: true,
    turnstileToken: "token",
  };

  test("join: invalid input → validation errors, nothing stored", async () => {
    const res = await submitJoinApplication({ ...join, phone: "1", consent: false });
    expect(res).toMatchObject({ ok: false, error: "validation" });
    expect(dbCalls).toHaveLength(0);
  });

  test("join: failed Turnstile → captcha error, nothing stored", async () => {
    turnstileOk = false;
    expect(await submitJoinApplication(join)).toEqual({ ok: false, error: "captcha" });
    expect(dbCalls).toHaveLength(0);
  });

  test("join: valid → stored with normalized phone/class and no extra fields", async () => {
    const res = await submitJoinApplication({ ...join, isAdmin: true, status: "accepted" });
    expect(res).toEqual({ ok: true });
    expect(insertedValues).toMatchObject({ phone: "+97699112233", className: "10А", email: null });
    expect(insertedValues).not.toHaveProperty("status");
    expect(insertedValues).not.toHaveProperty("isAdmin");
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
});
