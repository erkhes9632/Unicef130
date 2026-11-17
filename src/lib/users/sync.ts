import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { users } from "@/db/schema";
import { toRole, type AppRole } from "@/lib/auth/roles";

/** The fields we mirror from a Clerk user. */
type UserMirror = {
  id: string;
  email: string;
  name: string;
  role: AppRole | null;
  banned: boolean;
  twoFactorEnabled: boolean;
  lastSignInAt: Date | null;
  createdAt: Date;
};

type Dict = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const ms = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? new Date(v) : null);

/**
 * Normalizes a Clerk user from either the Backend API (camelCase, `@clerk/backend` User) or a
 * webhook payload (snake_case JSON) into the D1 mirror. Only the primary email and the name are
 * kept: the minimum we need.
 */
export function mirrorFromClerk(input: unknown): UserMirror | null {
  if (!input || typeof input !== "object") return null;
  const u = input as Dict;
  const id = str(u.id);
  if (!id) return null;
  const pick = (camel: string, snake: string) => (camel in u ? u[camel] : u[snake]);

  const emails = (pick("emailAddresses", "email_addresses") as Dict[] | undefined) ?? [];
  const primaryId = str(pick("primaryEmailAddressId", "primary_email_address_id"));
  const primary = emails.find((e) => str(e.id) === primaryId) ?? emails[0];
  const address = primary ? str(primary.emailAddress ?? primary.email_address) : "";

  const first = str(pick("firstName", "first_name")).trim();
  const last = str(pick("lastName", "last_name")).trim();
  const metadata = (pick("publicMetadata", "public_metadata") as Dict | undefined) ?? {};

  return {
    id,
    email: address.toLowerCase(),
    name: [first, last].filter(Boolean).join(" ") || str(u.username),
    role: toRole(metadata.role),
    banned: pick("banned", "banned") === true,
    twoFactorEnabled: pick("twoFactorEnabled", "two_factor_enabled") === true,
    lastSignInAt: ms(pick("lastSignInAt", "last_sign_in_at")),
    createdAt: ms(pick("createdAt", "created_at")) ?? new Date(),
  };
}

/** Inserts or refreshes the D1 row of a Clerk user; returns the stored row. */
export async function upsertUser(db: Database, m: UserMirror): Promise<UserRow | null> {
  const values = {
    email: m.email,
    name: m.name,
    role: m.role,
    banned: m.banned,
    twoFactorEnabled: m.twoFactorEnabled,
    lastSignInAt: m.lastSignInAt,
  };
  const [row] = await db
    .insert(users)
    .values({ id: m.id, ...values, createdAt: m.createdAt })
    .onConflictDoUpdate({ target: users.id, set: { ...values, updatedAt: new Date() } })
    .returning();
  return row ?? null;
}

type UserRow = typeof users.$inferSelect;

export async function findUser(db: Database, id: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}
