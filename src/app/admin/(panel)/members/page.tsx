import { and, asc, count, eq, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
import { CalendarPlus, History, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/components/admin/filter-bar";
import { MembersBulkList } from "@/components/admin/members-bulk-list";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Pager } from "@/components/admin/pager";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { memberYears, members } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { pageOffset, pageParam, param, searchParam, wordPrefix } from "@/lib/admin/list-query";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { teamYearOptions } from "@/lib/members/years";
import { displayYear } from "@/lib/school-year";
import { cn } from "@/lib/utils";
import { moveMember, removeFromYear, setMembersPublic } from "./actions";

export const metadata: Metadata = { title: "Гишүүд" };

/** "Who" filter: leadership, members from the annual report, members with a site account. */
const kinds = [
  { value: "", label: "Бүгд" },
  { value: "leadership", label: "Удирдлага" },
  { value: "report", label: "Тайлангийн гишүүн" },
  { value: "site", label: "Сайтад бүртгэлтэй" },
] as const;

const rowColumns = {
  id: members.id,
  name: members.name,
  nameEn: members.nameEn,
  role: memberYears.position,
  className: members.className,
  group: memberYears.role,
  photoUrl: members.photoUrl,
  showPhoto: members.showPhoto,
  active: members.active,
  showPublicly: memberYears.showPublicly,
  volunteerHours: members.volunteerHours,
  hoursYear: members.schoolYear,
  team: members.team,
  userId: members.userId,
};

/**
 * Гишүүд by school year: a year switcher (opens on the current year), then «Удирдлага» (all,
 * in order) and «Гишүүд» (25 per page), each with its count. Past years stay editable.
 */
export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const current = await getCurrentSchoolYear();
  const years = await teamYearOptions(db, current);
  const requested = param(sp, "year", 9);
  const year = years.includes(requested) ? requested : current;
  const past = year < current;
  const q = searchParam(sp);
  const team = param(sp, "team", 60);
  const kind = param(sp, "kind", 20);
  const onlyPublic = param(sp, "public", 1) === "1";
  const page = pageParam(sp);

  // Anonymized rows (deleted accounts) only count towards the hours total.
  const where: SQL[] = [eq(memberYears.schoolYear, year), eq(members.anonymized, false)];
  if (q) where.push(wordPrefix([members.name, members.nameEn], q));
  if (team) where.push(eq(members.team, team));
  if (kind === "report") where.push(isNull(members.userId));
  if (kind === "site") where.push(isNotNull(members.userId));
  if (onlyPublic) where.push(eq(memberYears.showPublicly, true));
  const leaderWhere = and(...where, eq(memberYears.role, "leadership"));
  const memberWhere = and(...where, eq(memberYears.role, "member"));
  const showLeaders = kind !== "report";
  const showMembers = kind !== "leadership";

  const base = () =>
    db
      .select(rowColumns)
      .from(memberYears)
      .innerJoin(members, eq(memberYears.memberId, members.id));
  const [leaders, rows, [memberTotal], [summary], teams, yearCounts] = await Promise.all([
    showLeaders
      ? base().where(leaderWhere).orderBy(asc(memberYears.sortOrder), asc(members.name))
      : Promise.resolve([]),
    showMembers
      ? base()
          .where(memberWhere)
          .orderBy(asc(members.name))
          .limit(PAGE_SIZE)
          .offset(pageOffset(page))
      : Promise.resolve([]),
    showMembers
      ? db
          .select({ n: count() })
          .from(memberYears)
          .innerJoin(members, eq(memberYears.memberId, members.id))
          .where(memberWhere)
      : Promise.resolve([{ n: 0 }]),
    db
      .select({
        leaders: sql<number>`sum(CASE WHEN ${memberYears.role} = 'leadership' THEN 1 ELSE 0 END)`,
        members: sql<number>`sum(CASE WHEN ${memberYears.role} = 'member' THEN 1 ELSE 0 END)`,
        report: sql<number>`sum(CASE WHEN ${memberYears.role} = 'member' AND ${members.userId} IS NULL THEN 1 ELSE 0 END)`,
        site: sql<number>`sum(CASE WHEN ${members.userId} IS NOT NULL THEN 1 ELSE 0 END)`,
        shown: sql<number>`sum(CASE WHEN ${memberYears.showPublicly} THEN 1 ELSE 0 END)`,
      })
      .from(memberYears)
      .innerJoin(members, eq(memberYears.memberId, members.id))
      .where(and(eq(memberYears.schoolYear, year), eq(members.anonymized, false))),
    db
      .selectDistinct({ team: members.team })
      .from(members)
      .where(and(ne(members.team, ""), eq(members.anonymized, false))),
    db
      .select({ y: memberYears.schoolYear, n: count() })
      .from(memberYears)
      .groupBy(memberYears.schoolYear),
  ]);
  const countOf = new Map(yearCounts.map((r) => [r.y, r.n]));
  const n = (v: unknown) => Number(v ?? 0);
  const leaderList = leaders.map((r, i) => ({
    ...r,
    first: i === 0,
    last: i === leaders.length - 1,
  }));
  const yearEmpty = countOf.get(year) === undefined;
  const filtered = !!(q || team || kind || onlyPublic);
  const bulk = {
    setPublic: setMembersPublic.bind(null, year),
    remove: removeFromYear.bind(null, year),
    move: moveMember.bind(null, year),
  };

  return (
    <>
      <AdminPageHeader
        title="Гишүүд"
        description="Клубын удирдлага ба гишүүд хичээлийн жилээр. Нэр анхнаасаа нууц; «Нийтэд харуулах»-ыг зөвхөн эцэг эх / асран хамгаалагчийн зөвшөөрөл авсны дараа асаана."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/school-year">
                <CalendarPlus /> Шинэ хичээлийн жил
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/members/new?year=${year}`}>
                <Plus /> Гишүүн нэмэх
              </Link>
            </Button>
          </div>
        }
      />

      <nav aria-label="Хичээлийн жил" className="mb-4">
        <ul className="flex flex-wrap gap-2">
          {years.map((y) => (
            <li key={y}>
              <Link
                href={y === current ? "/admin/members" : `/admin/members?year=${y}`}
                aria-current={y === year ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-border hover:bg-muted",
                  y === year && "bg-brand-cyan text-brand-ink ring-brand-cyan hover:bg-brand-cyan",
                )}
              >
                {displayYear(y)}
                {y === current && <span className="font-normal">(одоогийн)</span>}
                <span className="text-xs font-normal opacity-80">· {countOf.get(y) ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {sp.saved === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-brand-green-soft p-3 text-sm font-medium">
          Хадгалагдлаа.
        </p>
      )}
      {past && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-brand-gold-soft p-3 text-sm">
          <History className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Өмнөх жилийн мэдээлэл</strong> ({displayYear(year)}). Засах боломжтой — сайт
            дээр «Өмнөх жилүүд» хэсэгт харагдана.
          </span>
        </p>
      )}
      {yearEmpty ? (
        <div className="rounded-2xl border-2 border-dashed p-8 text-center">
          <p className="font-semibold">{displayYear(year)} оны баг хараахан үүсээгүй байна.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Удирдлагаа сонгоод, хүсвэл өмнөх жилийн гишүүдийг хуулна. Өмнөх жил хэвээр үлдэнэ.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/admin/school-year">
                <CalendarPlus /> Шинэ хичээлийн жил эхлүүлэх
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/members/new?year=${year}`}>
                <Plus /> Гишүүн нэмэх
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 rounded-xl bg-muted p-3 text-sm">
            {displayYear(year)}: Удирдлага {n(summary?.leaders)} · Гишүүн {n(summary?.members)}{" "}
            (тайлангийн {n(summary?.report)} · сайтад бүртгэлтэй {n(summary?.site)})
            <span className="text-muted-foreground">
              {" "}
              — нийтэд нэр нь харагдах {n(summary?.shown)}. Хувь хүний цаг сайт дээр хэзээ ч
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
            count={leaders.length + n(memberTotal?.n)}
            noun="гишүүн"
            emptyText="Ийм гишүүн олдсонгүй."
          >
            <div className="space-y-8">
              {showLeaders && (leaders.length > 0 || !filtered) && (
                <section aria-labelledby="group-leaders">
                  <h2 id="group-leaders" className="mb-3 font-bold">
                    Удирдлага <span className="text-muted-foreground">({leaders.length})</span>
                  </h2>
                  {leaders.length === 0 ? (
                    <p className="rounded-2xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
                      Энэ жилд удирдлага нэмэгдээгүй байна.
                    </p>
                  ) : (
                    <MembersBulkList rows={leaderList} year={year} {...bulk} />
                  )}
                </section>
              )}
              {showMembers && (
                <section aria-labelledby="group-members">
                  <h2 id="group-members" className="mb-3 font-bold">
                    Гишүүд <span className="text-muted-foreground">({n(memberTotal?.n)})</span>
                  </h2>
                  {rows.length === 0 ? (
                    <p className="rounded-2xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
                      {filtered ? "Ийм гишүүн олдсонгүй." : "Энэ жилд гишүүн нэмэгдээгүй байна."}
                    </p>
                  ) : (
                    <MembersBulkList rows={rows} year={year} {...bulk} />
                  )}
                  <Pager path="/admin/members" params={sp} page={page} total={n(memberTotal?.n)} />
                </section>
              )}
            </div>
          </FilterBar>
        </>
      )}
    </>
  );
}
