import { and, asc, count, eq, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/components/admin/filter-bar";
import { MembersBulkList } from "@/components/admin/members-bulk-list";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Pager } from "@/components/admin/pager";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { pageOffset, pageParam, param, searchParam, wordPrefix } from "@/lib/admin/list-query";
import { requireAdmin } from "@/lib/auth/session";
import { deleteMember, moveMember, setMembersPublic } from "./actions";

export const metadata: Metadata = { title: "Гишүүд" };

/** "Who" filter: leadership, members from the annual report, members with a site account. */
const kinds = [
  { value: "", label: "Бүгд" },
  { value: "leadership", label: "Удирдлага" },
  { value: "report", label: "Тайлангийн гишүүн" },
  { value: "site", label: "Сайтад бүртгэлтэй" },
] as const;

export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = searchParam(sp);
  const team = param(sp, "team", 60);
  const kind = param(sp, "kind", 20);
  const onlyPublic = param(sp, "public", 1) === "1";
  const page = pageParam(sp);

  // Anonymized rows (deleted accounts) only count towards the hours total.
  const where: SQL[] = [eq(members.anonymized, false)];
  if (q) where.push(wordPrefix([members.name, members.nameEn], q));
  if (team) where.push(eq(members.team, team));
  if (kind === "leadership") where.push(eq(members.group, "leadership"));
  if (kind === "report") where.push(and(eq(members.group, "member"), isNull(members.userId))!);
  if (kind === "site") where.push(isNotNull(members.userId));
  if (onlyPublic) where.push(eq(members.showPublicly, true));
  const condition = and(...where);

  const db = await getDb();
  const [[total], rows, [summary], teams] = await Promise.all([
    db.select({ n: count() }).from(members).where(condition),
    db
      .select({
        id: members.id,
        name: members.name,
        nameEn: members.nameEn,
        role: members.role,
        className: members.className,
        group: members.group,
        photoUrl: members.photoUrl,
        showPhoto: members.showPhoto,
        active: members.active,
        showPublicly: members.showPublicly,
        volunteerHours: members.volunteerHours,
        team: members.team,
        userId: members.userId,
      })
      .from(members)
      .where(condition)
      // Leadership first (in their order), then everyone else by name.
      .orderBy(
        sql`CASE WHEN ${members.group} = 'leadership' THEN 0 ELSE 1 END`,
        sql`CASE WHEN ${members.group} = 'leadership' THEN ${members.sortOrder} ELSE 0 END`,
        asc(members.name),
      )
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db
      .select({
        leaders: sql<number>`sum(CASE WHEN ${members.group} = 'leadership' THEN 1 ELSE 0 END)`,
        report: sql<number>`sum(CASE WHEN ${members.group} = 'member' AND ${members.userId} IS NULL THEN 1 ELSE 0 END)`,
        site: sql<number>`sum(CASE WHEN ${members.userId} IS NOT NULL THEN 1 ELSE 0 END)`,
        shown: sql<number>`sum(CASE WHEN ${members.showPublicly} THEN 1 ELSE 0 END)`,
      })
      .from(members)
      .where(eq(members.anonymized, false)),
    db
      .selectDistinct({ team: members.team })
      .from(members)
      .where(and(ne(members.team, ""), eq(members.anonymized, false))),
  ]);
  const leaders = rows.filter((r) => r.group === "leadership");
  const list = rows.map((r) => ({
    ...r,
    first: r.group === "leadership" && r.id === leaders[0]?.id && page === 1,
    last: r.group === "leadership" && r.id === leaders.at(-1)?.id,
  }));

  return (
    <>
      <AdminPageHeader
        title="Гишүүд"
        description="Клубын удирдлага ба гишүүд. Нэр анхнаасаа нууц; «Нийтэд харуулах»-ыг зөвхөн эцэг эх / асран хамгаалагчийн зөвшөөрөл авсны дараа асаана."
        actions={
          <Button asChild>
            <Link href="/admin/members/new">
              <Plus /> Гишүүн нэмэх
            </Link>
          </Button>
        }
      />
      {sp.saved === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-brand-green-soft p-3 text-sm font-medium">
          Хадгалагдлаа.
        </p>
      )}
      <p className="mb-4 rounded-xl bg-muted p-3 text-sm">
        Удирдлага {Number(summary?.leaders ?? 0)} · Тайлангийн гишүүн {Number(summary?.report ?? 0)}{" "}
        · Сайтад бүртгэлтэй {Number(summary?.site ?? 0)}
        <span className="text-muted-foreground">
          {" "}
          — нийтэд нэр нь харагдах {Number(summary?.shown ?? 0)}. Хувь хүний цаг сайт дээр хэзээ ч
          харагдахгүй.
        </span>
      </p>
      <FilterBar
        search={{ label: "Хайх (нэр)", placeholder: "Анужин" }}
        fields={[
          {
            type: "select",
            name: "kind",
            label: "Хэн",
            options: kinds.map((k) => ({ value: k.value, label: k.label })),
          },
          ...(teams.length > 0
            ? [
                {
                  type: "select" as const,
                  name: "team",
                  label: "Баг",
                  options: [
                    { value: "", label: "Бүх баг" },
                    ...teams
                      .map((t) => t.team)
                      .sort()
                      .map((t) => ({ value: t, label: t })),
                  ],
                },
              ]
            : []),
          { type: "toggle", name: "public", label: "Зөвхөн нийтэд харагдах" },
        ]}
        count={total?.n ?? 0}
        noun="гишүүн"
        emptyText="Ийм гишүүн олдсонгүй."
      >
        {list.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            Гишүүн хараахан нэмэгдээгүй байна.
          </p>
        ) : (
          <MembersBulkList
            rows={list}
            setPublic={setMembersPublic}
            deleteMember={deleteMember}
            move={moveMember}
          />
        )}
        <Pager path="/admin/members" params={sp} page={page} total={total?.n ?? 0} />
      </FilterBar>
    </>
  );
}
