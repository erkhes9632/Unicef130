import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { users } from "@/db/schema";
import { toRole, type AppRole } from "@/lib/auth/roles";
import { displayName } from "./profile";

/** The fields we mirror from a Clerk user. */
type UserMirror = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: AppRole | null;
  banned: boolean;
  twoFactorEnabled: boolean;
  lastSignInAt: Date | null;
  createdAt: Date;
  /** Clerk's `updated_at`: when these values were true (late webhooks are older). */
  updatedAt: Date | null;
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
    name: displayName(first, last) || str(u.username),
    firstName: first,
    lastName: last,
    role: toRole(metadata.role),
    banned: pick("banned", "banned") === true,
    twoFactorEnabled: pick("twoFactorEnabled", "two_factor_enabled") === true,
    lastSignInAt: ms(pick("lastSignInAt", "last_sign_in_at")),
    createdAt: ms(pick("createdAt", "created_at")) ?? new Date(),
    updatedAt: ms(pick("updatedAt", "updated_at")),
  };
}

/**
 * Inserts or refreshes the D1 row of a Clerk user; returns the stored row.
 *
 * The name is the person's own: after an edit on /me (or by an admin) `profile_updated_at` is
 * set, and a Clerk value older than that edit (a late or replayed webhook) never replaces it.
 * Clerk values without a timestamp count as old.
 */
export async function upsertUser(db: Database, m: UserMirror): Promise<UserRow | null> {
  const values = {
    email: m.email,
    role: m.role,
    banned: m.banned,
    twoFactorEnabled: m.twoFactorEnabled,
    lastSignInAt: m.lastSignInAt,
  };
  const clerkTime = m.updatedAt?.getTime() ?? 0;
  const keep = sql`${users.profileUpdatedAt} IS NOT NULL AND ${users.profileUpdatedAt} >= ${clerkTime}`;
  const nameOf = (
    col: typeof users.name | typeof users.firstName | typeof users.lastName,
    value: string,
  ) => sql`CASE WHEN ${keep} THEN ${col} ELSE ${value} END`;
  const [row] = await db
    .insert(users)
    .values({
      id: m.id,
      ...values,
      name: m.name,
      firstName: m.firstName,
      lastName: m.lastName,
      createdAt: m.createdAt,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        ...values,
        name: nameOf(users.name, m.name),
        firstName: nameOf(users.firstName, m.firstName),
        lastName: nameOf(users.lastName, m.lastName),
        updatedAt: new Date(),
      },
    })
    .returning();
  return row ?? null;
}

type UserRow = typeof users.$inferSelect;

export async function findUser(db: Database, id: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}
