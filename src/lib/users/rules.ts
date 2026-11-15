import type { AppRole } from "@/lib/auth/roles";

/** What an admin can do to an account in /admin/users (and a member to their own account). */
export type UserAction =
  "make-admin" | "make-member" | "remove-role" | "ban" | "unban" | "delete" | "self-delete";

export type UserActionRefusal = "self" | "last-admin" | "admin-self-delete" | "no-change";

/** Actions that take admin rights away from the target. */
const removesAdmin = new Set<UserAction>(["make-member", "remove-role", "ban", "delete"]);

/**
 * Guards for account actions. An admin can't ban, delete or demote themselves, the last admin
 * can never lose admin rights, and an admin can't delete their own account from /me (another
 * admin must demote them first).
 */
export function checkUserAction(input: {
  actorId: string;
  target: { id: string; role: AppRole | null; banned: boolean };
  action: UserAction;
  /** Active (not banned) admins right now. */
  adminCount: number;
}): UserActionRefusal | null {
  const { actorId, target, action, adminCount } = input;
  const self = actorId === target.id;

  if (action === "self-delete") {
    if (!self) return "self";
    return target.role === "admin" ? "admin-self-delete" : null;
  }
  if (self && action !== "make-admin" && action !== "unban") return "self";
  if (target.role === "admin" && removesAdmin.has(action) && adminCount <= 1) return "last-admin";

  if (action === "make-admin" && target.role === "admin") return "no-change";
  if (action === "make-member" && target.role === "member") return "no-change";
  if (action === "remove-role" && target.role === null) return "no-change";
  if (action === "ban" && target.banned) return "no-change";
  if (action === "unban" && !target.banned) return "no-change";
  return null;
}

export const userActionRefusalMessages: Record<UserActionRefusal, string> = {
  self: "Өөрийн бүртгэл дээр энэ үйлдлийг хийх боломжгүй.",
  "last-admin": "Сүүлчийн админы эрхийг хасах, идэвхгүй болгох, устгах боломжгүй.",
  "admin-self-delete":
    "Админ өөрийн бүртгэлийг устгах боломжгүй. Өөр админ эхлээд таны эрхийг хасна.",
  "no-change": "Өөрчлөх зүйл алга.",
};

/** The role an action leaves the account with (null = applicant). */
export function roleAfter(action: UserAction, current: AppRole | null): AppRole | null {
  if (action === "make-admin") return "admin";
  if (action === "make-member") return "member";
  if (action === "remove-role") return null;
  return current;
}
