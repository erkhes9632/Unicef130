"use server";

import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { eventSignups, events } from "@/db/schema";
import { AuthError, assertMember, assertSignedIn } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import {
  DELETE_CONFIRM_WORDS,
  placeHolding,
  signupOpen,
  signupStatusFor,
} from "@/lib/members/logic";
import { deleteClerkUser } from "@/lib/users/clerk-admin";
import { removeUserData } from "@/lib/users/delete";
import { parseProfile, saveProfile, type ProfileFormState } from "@/lib/users/profile-ops";
import { checkUserAction } from "@/lib/users/rules";

export type MeResult = {
  ok: boolean;
  error?:
    | "unauthenticated"
    | "forbidden"
    | "invalid"
    | "closed"
    | "notFound"
    | "adminSelfDelete"
    | "confirm"
    | "server";
  status?: "registered" | "waitlist" | "cancelled";
};

function fail(err: unknown): MeResult {
  if (err instanceof AuthError) return { ok: false, error: err.code };
  logger.error("me", "action failed", err);
  return { ok: false, error: "server" };
}

const revalidateMe = () => {
  revalidatePath("/me");
  revalidatePath("/en/me");
  revalidatePath("/me/profile");
  revalidatePath("/en/me/profile");
};

/**
 * "Миний мэдээлэл": any signed-in person edits their own last name, first name and class (never
 * anyone else's: the target is always the session's own id).
 */
export async function saveMyProfile(
  _prev: ProfileFormState,
  data: FormData,
): Promise<ProfileFormState> {
  try {
    const me = await assertSignedIn();
    const db = await getDb();
    const parsed = await parseProfile(db, me.role, {
      lastName: data.get("lastName") ?? "",
      firstName: data.get("firstName") ?? "",
      className: data.get("className") ?? "",
    });
    if (!parsed.ok) return { ok: false, error: "validation", fieldErrors: parsed.fieldErrors };
    const result = await saveProfile(db, me, me.id, parsed.profile);
    if (result.ok) revalidateMe();
    return result;
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    logger.error("me", "profile save failed", err);
    return { ok: false, error: "server" };
  }
}

/** Volunteer sign-up: a place while there is room, otherwise the waitlist. */
export async function signUpForEvent(eventId: string): Promise<MeResult> {
  try {
    const me = await assertMember();
    const db = await getDb();
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.published, true)))
      .limit(1);
    if (!event) return { ok: false, error: "notFound" };
    if (!signupOpen(event)) return { ok: false, error: "closed" };

    const [existing] = await db
      .select()
      .from(eventSignups)
      .where(and(eq(eventSignups.eventId, eventId), eq(eventSignups.userId, me.id)))
      .limit(1);
    if (existing && existing.status !== "cancelled")
      return { ok: true, status: existing.status === "waitlist" ? "waitlist" : "registered" };

    const [taken] = await db
      .select({ n: count() })
      .from(eventSignups)
      .where(
        and(
          eq(eventSignups.eventId, eventId),
          inArray(eventSignups.status, [...placeHolding]),
          ne(eventSignups.userId, me.id),
        ),
      );
    const status = signupStatusFor(event, taken?.n ?? 0);
    if (existing) {
      await db
        .update(eventSignups)
        .set({ status, updatedAt: new Date() })
        .where(eq(eventSignups.id, existing.id));
    } else {
      await db.insert(eventSignups).values({ eventId, userId: me.id, status });
    }
    revalidateMe();
    return { ok: true, status };
  } catch (err) {
    return fail(err);
  }
}

/** Cancels a sign-up; a freed place goes to the first member on the waitlist. */
export async function cancelSignup(eventId: string): Promise<MeResult> {
  try {
    const me = await assertMember();
    const db = await getDb();
    const [row] = await db
      .select()
      .from(eventSignups)
      .where(and(eq(eventSignups.eventId, eventId), eq(eventSignups.userId, me.id)))
      .limit(1);
    if (!row || (row.status !== "registered" && row.status !== "waitlist"))
      return { ok: false, error: "notFound" };
    await db
      .update(eventSignups)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(eventSignups.id, row.id));
    if (row.status === "registered") {
      const [next] = await db
        .select({ id: eventSignups.id })
        .from(eventSignups)
        .where(and(eq(eventSignups.eventId, eventId), eq(eventSignups.status, "waitlist")))
        .orderBy(asc(eventSignups.createdAt))
        .limit(1);
      if (next)
        await db
          .update(eventSignups)
          .set({ status: "registered", updatedAt: new Date() })
          .where(eq(eventSignups.id, next.id));
    }
    revalidateMe();
    return { ok: true, status: "cancelled" };
  } catch (err) {
    return fail(err);
  }
}

/**
 * "Бүртгэлээ устгах": same as an admin delete (Clerk user + D1 personal data; hours stay as
 * anonymous totals). Admins can't delete themselves — another admin must demote them first.
 */
export async function deleteMyAccount(confirmWord: string): Promise<MeResult> {
  try {
    const me = await assertSignedIn();
    const refusal = checkUserAction({
      actorId: me.id,
      target: { id: me.id, role: me.role, banned: false },
      action: "self-delete",
      adminCount: 0,
    });
    if (refusal) return { ok: false, error: "adminSelfDelete" };
    if (!DELETE_CONFIRM_WORDS.includes(confirmWord.trim().toLocaleUpperCase("mn")))
      return { ok: false, error: "confirm" };
    await deleteClerkUser(me.id);
    // The account is gone, so the audit row is written without an actor.
    await removeUserData(await getDb(), me.id, null);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
