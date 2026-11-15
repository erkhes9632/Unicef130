import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { NativeSelect } from "@/components/admin/form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { UserRowActions } from "@/components/admin/users-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { applications, members, users } from "@/db/schema";
import { roleLabel, toRole } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { applicationStatusLabels } from "@/lib/recruitment/logic";
import { filterUsers, parseUserFilters, userFilterOptions } from "@/lib/users/list";
import {
  changeUserRole,
  deleteUserAccount,
  linkAccountToMember,
  refreshUser,
  setUserBanned,
} from "./actions";

export const metadata: Metadata = { title: "Хэрэглэгчид" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const filters = parseUserFilters(await searchParams);
  const db = await getDb();
  const [rows, apps, linked, candidates] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db
      .select({
        userId: applications.userId,
        status: applications.status,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .where(isNotNull(applications.userId))
      .orderBy(desc(applications.createdAt)),
    db
      .select({ id: members.id, userId: members.userId, name: members.name })
      .from(members)
      .where(isNotNull(members.userId)),
    db
      .select({ id: members.id, name: members.name, email: members.email })
      .from(members)
      .where(and(isNull(members.userId), isNotNull(members.email), eq(members.anonymized, false))),
  ]);

  // Latest application per account (rows are newest first).
  const latestApp = new Map<string, (typeof apps)[number]>();
  for (const a of apps) if (a.userId && !latestApp.has(a.userId)) latestApp.set(a.userId, a);
  const memberOf = new Map(linked.map((m) => [m.userId!, m]));
  const candidatesFor = (email: string) =>
    email ? candidates.filter((c) => c.email?.toLowerCase() === email.toLowerCase()) : [];

  const shown = filterUsers(
    rows.map((r) => ({
      ...r,
      role: toRole(r.role),
      applicationStatus: latestApp.get(r.id)?.status,
    })),
    filters,
  );

  return (
    <>
      <AdminPageHeader
        title="Хэрэглэгчид"
        description="Сайтад нэвтэрсэн бүх хүн: өргөдөл гаргагч, гишүүн, админ. Хүн бүр Google эсвэл и-мэйлээр өөрөө бүртгүүлнэ; эрхийг энд олгоно. Админ өөрийгөө болон сүүлчийн админыг хасаж, идэвхгүй болгож, устгаж чадахгүй."
      />

      <form className="mb-6 grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:grid-cols-[1fr_14rem_auto]">
        <label className="space-y-1 text-xs font-semibold">
          <span>Хайх (нэр, и-мэйл)</span>
          <Input name="q" defaultValue={filters.q} placeholder="Анужин / name@gmail.com" />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Төрөл</span>
          <NativeSelect name="role" defaultValue={filters.role}>
            {userFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Шүүх</Button>
          <Button asChild variant="ghost">
            <Link href="/admin/users">Цэвэрлэх</Link>
          </Button>
        </div>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">{shown.length} хэрэглэгч</p>
      {shown.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          Хэрэглэгч олдсонгүй.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {shown.map((r) => {
            const app = latestApp.get(r.id);
            const member = memberOf.get(r.id);
            return (
              <li key={r.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold">{r.name || "Нэргүй"}</span>
                  <span className="text-sm break-all text-muted-foreground">{r.email}</span>
                  <Badge variant={r.role === "admin" ? "default" : "secondary"}>
                    {roleLabel(r.role)}
                  </Badge>
                  {r.banned && <Badge variant="destructive">Идэвхгүй</Badge>}
                  {r.applyBlocked && <Badge variant="outline">Өргөдөл хориглосон</Badge>}
                  {r.id === me.id && <Badge variant="outline">Та</Badge>}
                </div>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Бүртгүүлсэн: {formatDate("mn", r.createdAt, "long")}</span>
                  {r.lastSignInAt && (
                    <span>Сүүлд нэвтэрсэн: {formatDate("mn", r.lastSignInAt, "long")}</span>
                  )}
                  {app && <span>Өргөдөл: {applicationStatusLabels[app.status]}</span>}
                  {member && (
                    <Link href={`/admin/members/${member.id}`} className="font-semibold underline">
                      Гишүүн: {member.name}
                    </Link>
                  )}
                  {r.role === "admin" && !r.twoFactorEnabled && (
                    <span className="font-semibold text-brand-gold-strong">2FA асаагаагүй</span>
                  )}
                </p>
                <UserRowActions
                  row={{
                    id: r.id,
                    email: r.email,
                    role: r.role,
                    banned: r.banned,
                    isSelf: r.id === me.id,
                    linkCandidates: member ? [] : candidatesFor(r.email),
                  }}
                  changeRole={changeUserRole.bind(null, r.id)}
                  setBanned={setUserBanned.bind(null, r.id)}
                  deleteAccount={deleteUserAccount.bind(null, r.id)}
                  linkMember={linkAccountToMember.bind(null, r.id)}
                  refresh={refreshUser.bind(null, r.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
