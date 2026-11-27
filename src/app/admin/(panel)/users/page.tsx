import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty } from "@/components/admin/admin-empty";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Pager } from "@/components/admin/pager";
import { EditProfileDialog, UserRowActions } from "@/components/admin/users-client";
import { profileLabels, splitLegacyName } from "@/components/me/profile-card";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import { applications, members, users } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { pageOffset, pageParam } from "@/lib/admin/list-query";
import { roleLabel, toRole } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { applicationStatusLabels } from "@/lib/recruitment/logic";
import { parseUserFilters, userFilterOptions, userFilterWhere } from "@/lib/users/list";
import { classRequiredFor } from "@/lib/users/profile";
import { currentClassList } from "@/lib/users/profile-ops";
import {
  changeUserRole,
  deleteUserAccount,
  linkAccountToMember,
  refreshUser,
  setUserBanned,
  updateUserProfile,
} from "./actions";

export const metadata: Metadata = { title: "Хэрэглэгчид" };

/**
 * One page of accounts (≤ 25): the filters run in SQL, and the extra lookups (latest
 * application, linked member, link candidates) only for the accounts on this page.
 */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const params = await searchParams;
  const filters = parseUserFilters(params);
  const page = pageParam(params);
  const db = await getDb();
  const where = userFilterWhere(filters);
  const [[total], rows, classes, labels] = await Promise.all([
    db.select({ n: count() }).from(users).where(where),
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        className: users.className,
        role: users.role,
        banned: users.banned,
        applyBlocked: users.applyBlocked,
        twoFactorEnabled: users.twoFactorEnabled,
        lastSignInAt: users.lastSignInAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    currentClassList(db),
    profileLabels("mn"),
  ]);
  const ids = rows.map((r) => r.id);
  const emails = rows.map((r) => r.email.toLowerCase()).filter(Boolean);
  const [apps, linked, candidates] = ids.length
    ? await Promise.all([
        db
          .select({ userId: applications.userId, status: applications.status })
          .from(applications)
          .where(inArray(applications.userId, ids))
          .orderBy(desc(applications.createdAt)),
        db
          .select({ id: members.id, userId: members.userId, name: members.name })
          .from(members)
          .where(inArray(members.userId, ids)),
        emails.length
          ? db
              .select({ id: members.id, name: members.name, email: members.email })
              .from(members)
              .where(
                and(
                  isNull(members.userId),
                  isNotNull(members.email),
                  eq(members.anonymized, false),
                  inArray(members.email, emails),
                ),
              )
          : [],
      ])
    : [[], [], []];

  // Latest application per account (rows are newest first).
  const latestApp = new Map<string, (typeof apps)[number]>();
  for (const a of apps) if (a.userId && !latestApp.has(a.userId)) latestApp.set(a.userId, a);
  const memberOf = new Map(linked.map((m) => [m.userId!, m]));
  const candidatesFor = (email: string) =>
    candidates.filter((c) => c.email?.toLowerCase() === email.toLowerCase());

  return (
    <>
      <AdminPageHeader
        title="Хэрэглэгчид"
        description="Сайтад нэвтэрсэн бүх хүн: өргөдөл гаргагч, гишүүн, админ. Хүн бүр Google эсвэл и-мэйлээр өөрөө бүртгүүлнэ; эрхийг энд олгоно. Админ өөрийгөө болон сүүлчийн админыг хасаж, идэвхгүй болгож, устгаж чадахгүй."
      />

      <FilterBar
        search={{ label: "Хайх (нэр, и-мэйл)", placeholder: "Анужин / name@gmail.com" }}
        fields={[
          {
            type: "select",
            name: "role",
            label: "Төрөл",
            options: userFilterOptions.map((o) => ({ value: o.value, label: o.label })),
          },
        ]}
        count={total?.n ?? 0}
        noun="хэрэглэгч"
        emptyText="Ийм хэрэглэгч олдсонгүй."
      >
        {rows.length === 0 ? (
          <AdminEmpty
            title="Хэрэглэгч хараахан алга."
            hint="Хүн сайтад нэвтэрсний дараа энд гарна; дараа нь эрх (гишүүн, админ) өгнө."
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {rows.map((r) => {
              const role = toRole(r.role);
              const app = latestApp.get(r.id);
              const member = memberOf.get(r.id);
              const hasName = r.name.trim() !== "";
              return (
                <li key={r.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {hasName ? (
                      <>
                        <span className="font-bold">{r.name}</span>
                        <span className="text-sm break-all text-muted-foreground">{r.email}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold break-all">{r.email}</span>
                        <Badge variant="outline">Нэр оруулаагүй</Badge>
                      </>
                    )}
                    <Badge variant={role === "admin" ? "default" : "secondary"}>
                      {roleLabel(role)}
                    </Badge>
                    {r.className && <Badge variant="outline">{r.className}</Badge>}
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
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="font-semibold underline"
                      >
                        Гишүүн: {member.name}
                      </Link>
                    )}
                    {role === "admin" && !r.twoFactorEnabled && (
                      <span className="font-semibold text-brand-gold-strong">
                        Хоёр шаттай баталгаажуулалт асаагаагүй
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <EditProfileDialog
                      action={updateUserProfile.bind(null, r.id)}
                      initial={{ ...splitLegacyName(r), className: r.className }}
                      email={r.email}
                      classes={classes}
                      classRequired={classRequiredFor(role)}
                      labels={labels}
                    />
                    <UserRowActions
                      row={{
                        id: r.id,
                        email: r.email,
                        role,
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
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pager path="/admin/users" params={params} page={page} total={total?.n ?? 0} />
      </FilterBar>
    </>
  );
}
