import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CreateUserForm, UserRowActions } from "@/components/admin/users-client";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { createUser, resetUserPassword, setUserDisabled, setUserRole } from "./actions";

export const metadata: Metadata = { title: "Хэрэглэгчид" };

export default async function AdminUsersPage() {
  const me = await requireUser("admin");
  const db = await getDb();
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
    })
    .from(user)
    .orderBy(asc(user.createdAt));

  return (
    <>
      <AdminPageHeader
        title="Хэрэглэгчид"
        description="Админ: бүх эрхтэй. Редактор: мэдээ, арга хэмжээ, гишүүд, цомог, өргөдөл удирдана."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <ul className="h-fit divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {rows.map((r) => (
            <UserRowActions
              key={r.id}
              row={r}
              isSelf={r.id === me.id}
              setRole={setUserRole.bind(null, r.id)}
              setDisabled={setUserDisabled.bind(null, r.id)}
              resetPassword={resetUserPassword.bind(null, r.id)}
            />
          ))}
        </ul>
        <CreateUserForm action={createUser} />
      </div>
    </>
  );
}
