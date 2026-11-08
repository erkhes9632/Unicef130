import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { createDb } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

function createAuth(env: CloudflareEnv) {
  const db = createDb(env.DB);
  const trustedOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return betterAuth({
    appName: "130 UNICEF клуб",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || undefined, // inferred from the request when unset
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      // No public sign-up: the first admin is created by `bun run admin:create`,
      // other users are created by admins in /admin/users.
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
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
    rateLimit: { enabled: true, window: 60, max: 30 },
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
    plugins: [nextCookies()],
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
