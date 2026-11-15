import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor as twoFactorPlugin } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { createDb } from "@/db";
import { account, rateLimit, session, twoFactor, user, verification } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./password-policy";

function createAuth(env: CloudflareEnv) {
  const db = createDb(env.DB);
  const trustedOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const isDev = env.NEXTJS_ENV === "development";

  return betterAuth({
    appName: "UNICEF Club admin",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || undefined, // inferred from the request when unset
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user, session, account, verification, rateLimit, twoFactor },
    }),
    emailAndPassword: {
      enabled: true,
      // No public sign-up: the first admin is created by `bun run admin:create`,
      // other users are created by admins in /admin/users.
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "editor", input: false },
        banned: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh daily
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    // Stored in D1 so every Worker isolate shares the counters (in-memory limits reset per
    // isolate). The admin login form is a Server Action and has its own limiter (login-limit.ts).
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/*": { window: 15 * 60, max: 10 },
        "/two-factor/*": { window: 15 * 60, max: 10 },
        "/sign-up/*": { window: 60, max: 3 },
      },
    },
    advanced: {
      // Secure cookies everywhere except local http development.
      useSecureCookies: !isDev,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: !isDev },
      // Cloudflare sets cf-connecting-ip itself (clients cannot spoof it); x-forwarded-for is
      // only a local-development fallback. Used for the rate-limit keys.
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    databaseHooks: {
      session: {
        create: {
          // Disabled users cannot sign in.
          before: async (s) => {
            const [u] = await db
              .select({ banned: user.banned })
              .from(user)
              .where(eq(user.id, s.userId));
            if (!u || u.banned) return false;
          },
        },
      },
    },
    // nextCookies must stay last: it forwards Set-Cookie from Server Actions.
    plugins: [twoFactorPlugin({ issuer: "UNICEF Club 130" }), nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

// One instance per D1 binding object (stable within a Worker isolate).
const cache = new WeakMap<object, Auth>();

export async function getAuth(): Promise<Auth> {
  const { env } = await getCloudflareContext({ async: true });
  let auth = cache.get(env.DB);
  if (!auth) {
    auth = createAuth(env);
    cache.set(env.DB, auth);
  }
  return auth;
}
