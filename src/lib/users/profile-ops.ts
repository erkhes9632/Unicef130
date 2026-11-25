import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { applications, members, recruitmentPeriods, users } from "@/db/schema";
import { logActivity, shortId } from "@/lib/admin/activity";
import { consumeRateLimit } from "@/lib/rate-limit";
import { findOpenPeriod } from "@/lib/recruitment/logic";
import { buildProfileSchema, classRequiredFor, displayName, type Profile } from "./profile";

/** Saves per person (the one editing) per hour. */
export const PROFILE_SAVES_PER_HOUR = 10;

export type ProfileFormState = {
  ok: boolean;
  error?: "validation" | "rate" | "server" | "unauthenticated" | "forbidden" | "notFound";
  fieldErrors?: Partial<Record<keyof Profile, string>>;
};

/** The class list of the enrollment open now (the join form uses the same list), else []. */
export async function currentClassList(db: Database): Promise<string[]> {
  const periods = await db
    .select({
      opensAt: recruitmentPeriods.opensAt,
      closesAt: recruitmentPeriods.closesAt,
      classes: recruitmentPeriods.classes,
    })
    .from(recruitmentPeriods);
  return findOpenPeriod(periods)?.classes ?? [];
}

/** Validates against the target's role and the current class list (pure parts in ./profile). */
export async function parseProfile(
  db: Database,
  role: string | null,
  input: { lastName: unknown; firstName: unknown; className: unknown },
) {
  const schema = buildProfileSchema({
    classRequired: classRequiredFor(role),
    classes: await currentClassList(db),
  });
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true as const, profile: parsed.data };
  const fieldErrors: ProfileFormState["fieldErrors"] = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof Profile;
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false as const, fieldErrors };
}

/**
 * Writes a person's name and class: Clerk first (the account's name), then D1 in one batch
 * (= one transaction): the users row (with `profile_updated_at`, so a late webhook never undoes
 * it), the linked member row and the class of the latest application. The audit entry holds
 * ids only, never the name. Callers check who may edit whom.
 */
export async function saveProfile(
  db: Database,
  actor: { id: string },
  targetId: string,
  profile: Profile,
): Promise<ProfileFormState> {
  const limit = await consumeRateLimit(`profile:${actor.id}`, PROFILE_SAVES_PER_HOUR, 3_600_000);
  if (!limit.allowed) return { ok: false, error: "rate" };

  const client = await clerkClient();
  await client.users.updateUser(targetId, {
    firstName: profile.firstName,
    lastName: profile.lastName,
  });

  const now = new Date();
  const name = displayName(profile.firstName, profile.lastName);
  const [latest] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.userId, targetId))
    .orderBy(desc(applications.createdAt))
    .limit(1);
  await db.batch([
    db
      .update(users)
      .set({
        name,
        firstName: profile.firstName,
        lastName: profile.lastName,
        className: profile.className,
        profileUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, targetId)),
    db
      .update(members)
      .set(
        profile.className
          ? { name, className: profile.className, updatedAt: now }
          : { name, updatedAt: now },
      )
      .where(eq(members.userId, targetId)),
    ...(latest && profile.className
      ? [
          db
            .update(applications)
            .set({ className: profile.className, updatedAt: now })
            .where(eq(applications.id, latest.id)),
        ]
      : []),
  ]);

  const self = actor.id === targetId;
  await logActivity(actor, self ? "user.profile_self" : "user.profile", {
    type: "user",
    id: targetId,
    summary: self
      ? `Бүртгэл #${shortId(targetId)} — нэр, ангиа засав`
      : `Бүртгэл #${shortId(targetId)} — нэр, анги засав`,
  });
  return { ok: true };
}
