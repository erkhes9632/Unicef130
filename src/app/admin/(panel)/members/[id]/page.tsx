import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { MemberForm } from "@/components/admin/member-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { memberYears, members } from "@/db/schema";
import { param } from "@/lib/admin/list-query";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentSchoolYear } from "@/lib/data/settings";
import { listTeams } from "@/lib/members/teams";
import { teamYearOptions } from "@/lib/members/years";
import { displayYear } from "@/lib/school-year";
import { cn } from "@/lib/utils";
import { addMemberToYear, deleteMember, saveMember } from "../actions";

export const metadata: Metadata = { title: "Гишүүн засах" };

/**
 * One person: the form edits the person and their membership in one school year (?year=, else
 * the latest year they were in). The years they belong to are listed with links; other years
 * can be added.
 */
export default async function EditMemberPage({
  params,
  searchParams,
}: PageProps<"/admin/members/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const [[m], years, current] = await Promise.all([
    db.select().from(members).where(eq(members.id, id)).limit(1),
    db
      .select()
      .from(memberYears)
      .where(eq(memberYears.memberId, id))
      .orderBy(desc(memberYears.schoolYear)),
    getCurrentSchoolYear(),
  ]);
  if (!m) notFound();
  const requested = param(sp, "year", 9);
  const membership =
    years.find((y) => y.schoolYear === requested) ?? (requested ? undefined : years[0]);
  const year = membership?.schoolYear ?? (requested || current);
  const past = year < current;
  const options = await teamYearOptions(db, current);
  const missing = options.filter((y) => !years.some((r) => r.schoolYear === y));
  const [inYear] = membership
    ? [membership]
    : await db
        .select()
        .from(memberYears)
        .where(and(eq(memberYears.memberId, id), eq(memberYears.schoolYear, year)))
        .limit(1);

  return (
    <>
      <AdminPageHeader
        title="Гишүүн засах"
        description={`${m.name} · ${displayYear(year)}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/members?year=${year}`}>← {displayYear(year)} оны жагсаалт</Link>
          </Button>
        }
      />
      <section
        aria-labelledby="member-years"
        className="mb-6 rounded-2xl bg-card p-4 ring-1 ring-border"
      >
        <h2 id="member-years" className="mb-2 text-sm font-bold">
          Хичээлийн жилүүд
        </h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {years.map((y) => (
            <li key={y.id}>
              <Link
                href={`/admin/members/${id}?year=${y.schoolYear}`}
                aria-current={y.schoolYear === year ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 font-semibold ring-1 ring-border hover:bg-muted",
                  y.schoolYear === year && "bg-brand-cyan text-brand-ink ring-brand-cyan",
                )}
              >
                {displayYear(y.schoolYear)} · {y.role === "leadership" ? "Удирдлага" : "Гишүүн"}
              </Link>
            </li>
          ))}
          {missing.map((y) => (
            <li key={y}>
              <ConfirmAction
                action={addMemberToYear.bind(null, id, y)}
                title={`${displayYear(y)} хичээлийн жилд нэмэх үү?`}
                description="Гишүүнээр нэмэгдэнэ (нэр нийтэд харагдахгүй). Дараа нь үүргийг засна."
                confirmLabel="Нэмэх"
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 rounded-full"
                  >
                    + {displayYear(y)}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
        {past && (
          <p className="mt-3 rounded-xl bg-brand-gold-soft p-3 text-sm">
            <strong>Өмнөх жилийн мэдээлэл</strong> ({displayYear(year)}) — засах боломжтой.
          </p>
        )}
        {!membership && !inYear && (
          <p className="mt-3 text-sm text-muted-foreground">
            Энэ хүн {displayYear(year)} оны багт байхгүй. Хадгалбал энэ жилд нэмэгдэнэ.
          </p>
        )}
      </section>
      <MemberForm
        key={year}
        action={saveMember.bind(null, m.id)}
        year={year}
        initial={{
          ...m,
          group: inYear?.role ?? m.group,
          role: inYear?.position ?? m.role,
          roleEn: inYear ? inYear.positionEn : m.roleEn,
          showPublicly: inYear?.showPublicly ?? false,
          hasAccount: !!m.userId,
        }}
        teams={await listTeams()}
      />
      <div className="mt-10 max-w-4xl rounded-2xl p-4 ring-1 ring-destructive/40">
        <h2 className="font-bold">Бүрмөсөн устгах</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Хүнийг бүх хичээлийн жилээс устгана. Ихэнх тохиолдолд жагсаалтаас «энэ жилээс хасах»
          хангалттай.
        </p>
        <ConfirmAction
          action={deleteMember.bind(null, m.id)}
          description={`${m.name}-г бүх жилээс бүрмөсөн устгах уу? Бүртгэгдсэн цаг нь нийт дүнд үлдэхгүй.`}
          trigger={
            <Button type="button" variant="outline" className="text-destructive">
              Бүрмөсөн устгах
            </Button>
          }
        />
      </div>
    </>
  );
}
