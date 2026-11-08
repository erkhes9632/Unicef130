"use server";

import { and, count, eq, isNull, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { account, session, user } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { generatePassword } from "@/lib/admin/password-gen";
import { hashPassword } from "@/lib/auth/password";
import { requireRole } from "@/lib/auth/session";
import { userCreateSchema } from "@/lib/validation/admin";

export type UserActionState = ActionState & { password?: string; email?: string };

async function otherActiveAdmins(excludeId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(user)
    .where(
      and(
        eq(user.role, "admin"),
        or(eq(user.banned, false), isNull(user.banned)),
        ne(user.id, excludeId),
      ),
    );
  return row?.n ?? 0;
}

export async function createUser(_prev: UserActionState, data: FormData): Promise<UserActionState> {
  try {
    const me = await requireRole("admin");
    const parsed = userCreateSchema.safeParse({
      name: fd.str(data, "name"),
      email: fd.str(data, "email").toLowerCase(),
      role: fd.str(data, "role"),
      password: fd.str(data, "password"),
    });
    if (!parsed.success) return validationError(parsed.error);
    const { name, email, role } = parsed.data;
    const db = await getDb();
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existing.length) return { ok: false, message: "Энэ и-мэйлтэй хэрэглэгч аль хэдийн байна." };

    const password = parsed.data.password || generatePassword();
    const id = crypto.randomUUID();
    const hash = await hashPassword(password);
    await db.batch([
      db.insert(user).values({ id, name, email, role, emailVerified: true, banned: false }),
      db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: hash,
      }),
    ]);
    await logActivity(me, "user.create", {
      type: "user",
      id,
      summary: `${email} хэрэглэгч (${role}) нэмэв`,
    });
    revalidatePath("/admin/users");
    return {
      ok: true,
      message:
        "Хэрэглэгч үүслээ. Нууц үгийг зөвхөн нэг удаа харуулж байна — хуулж аваад хүлээлгэн өгнө үү.",
      password: parsed.data.password ? undefined : password,
      email,
    };
  } catch (err) {
    return actionError(err);
  }
}

export async function setUserRole(id: string, role: "admin" | "editor"): Promise<ActionState> {
  try {
    const me = await requireRole("admin");
    if (id === me.id) return { ok: false, message: "Өөрийнхөө эрхийг өөрчлөх боломжгүй." };
    if (role === "editor" && (await otherActiveAdmins(id)) === 0) {
      return { ok: false, message: "Дор хаяж нэг идэвхтэй админ байх ёстой." };
    }
    const db = await getDb();
    const [row] = await db
      .update(user)
      .set({ role })
      .where(eq(user.id, id))
      .returning({ email: user.email });
    if (!row) return { ok: false, message: "Хэрэглэгч олдсонгүй." };
    await logActivity(me, "user.role", { type: "user", id, summary: `${row.email} → ${role}` });
    revalidatePath("/admin/users");
    return { ok: true, message: "Эрх шинэчлэгдлээ." };
  } catch (err) {
    return actionError(err);
  }
}

export async function setUserDisabled(id: string, disabled: boolean): Promise<ActionState> {
  try {
    const me = await requireRole("admin");
    if (id === me.id) return { ok: false, message: "Өөрийгөө идэвхгүй болгох боломжгүй." };
    const db = await getDb();
    const [target] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    if (!target) return { ok: false, message: "Хэрэглэгч олдсонгүй." };
    if (disabled && target.role === "admin" && (await otherActiveAdmins(id)) === 0) {
      return { ok: false, message: "Дор хаяж нэг идэвхтэй админ байх ёстой." };
    }
    const [row] = await db
      .update(user)
      .set({ banned: disabled })
      .where(eq(user.id, id))
      .returning({ email: user.email });
    // Sign the user out everywhere.
    if (disabled) await db.delete(session).where(eq(session.userId, id));
    await logActivity(me, disabled ? "user.disable" : "user.enable", {
      type: "user",
      id,
      summary: `${row?.email} ${disabled ? "идэвхгүй болгов" : "идэвхжүүлэв"}`,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: disabled ? "Хэрэглэгч идэвхгүй боллоо." : "Хэрэглэгч идэвхжлээ." };
  } catch (err) {
    return actionError(err);
  }
}

export async function resetUserPassword(id: string): Promise<UserActionState> {
  try {
    const me = await requireRole("admin");
    const db = await getDb();
    const password = generatePassword();
    const hash = await hashPassword(password);
    const res = await db
      .update(account)
      .set({ password: hash })
      .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
      .returning({ id: account.id });
    if (!res.length) return { ok: false, message: "Хэрэглэгч олдсонгүй." };
    await db.delete(session).where(eq(session.userId, id));
    const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
    await logActivity(me, "user.password_reset", {
      type: "user",
      id,
      summary: `${u?.email} нууц үгийг шинэчлэв`,
    });
    return { ok: true, message: "Шинэ нууц үг (нэг удаа харагдана):", password, email: u?.email };
  } catch (err) {
    return actionError(err);
  }
}
