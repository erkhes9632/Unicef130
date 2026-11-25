import { desc, isNotNull } from "drizzle-orm";
import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FilterBar } from "@/components/admin/filter-bar";
import { HoursBoard } from "@/components/admin/hours-client";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { events, members, volunteerHours } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import { ubToday } from "@/lib/dates/ub-time";
import { listHoursEntries } from "@/lib/members/hours";
import { schoolYearOf, schoolYearOptions } from "@/lib/members/logic";
import { yearSummary } from "@/lib/members/year-summary";
import { addHours, deleteHoursEntry } from "./actions";

export const metadata: Metadata = { title: "Сайн дурын цаг" };

export default async function AdminHoursPage({ searchParams }: PageProps<"/admin/hours">) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const [loggedYears, memberYears, settings, recentEvents] = await Promise.all([
    db.selectDistinct({ y: volunteerHours.schoolYear }).from(volunteerHours),
    db.selectDistinct({ y: members.schoolYear }).from(members).where(isNotNull(members.schoolYear)),
    getSiteSettings(),
    db
      .select({ id: events.id, title: events.title })
      .from(events)
      .orderBy(desc(events.startsAt))
      .limit(40),
  ]);
  const years = schoolYearOptions([...loggedYears, ...memberYears].map((r) => r.y));
  const year = typeof sp.year === "string" && years.includes(sp.year) ? sp.year : years[0]!;
  const team = typeof sp.team === "string" ? sp.team : "";
  const threshold = settings.membership.activeMemberHours;
  const [{ listed, totalAll }, entries] = await Promise.all([
    yearSummary(db, year, threshold),
    listHoursEntries(db, year),
  ]);
  const teams = [...new Set(listed.map((r) => r.member.team).filter(Boolean))].sort();
  const rows = listed
    .filter((r) => !team || r.member.team === team)
    .map((r) => ({
      id: r.member.id,
      name: r.member.name,
      className: r.member.className,
      team: r.member.team,
      imported: r.imported,
      logged: r.logged,
      total: r.total,
      active: r.active,
    }));
  const today = ubToday();

  return (
    <>
      <AdminPageHeader
        title="Сайн дурын цаг"
        description={`Гишүүдийн цагийн бүртгэл. Хувь хүний цаг сайт дээр хэзээ ч харагдахгүй. ${year}: нийт ${totalAll} цаг${threshold ? ` · идэвхтэй гишүүний босго ${threshold} цаг` : " · идэвхтэй гишүүний босгыг Сайтын тохиргооноос оруулна"}.`}
        actions={
          <Button asChild variant="outline">
            <a href={`/admin/hours/export?year=${encodeURIComponent(year)}`}>
              <Download /> CSV (тайланд)
            </a>
          </Button>
        }
      />
      <FilterBar
        fields={[
          {
            type: "select",
            name: "year",
            label: "Хичээлийн жил",
            // "" = the latest year (the default when the address has none).
            options: years.map((y, i) => ({ value: i === 0 ? "" : y, label: y })),
          },
          {
            type: "select",
            name: "team",
            label: "Баг",
            options: [{ value: "", label: "Бүгд" }, ...teams.map((t) => ({ value: t, label: t }))],
          },
        ]}
        count={rows.length}
        noun="гишүүн"
        emptyText="Энэ багт гишүүн алга."
      >
        <HoursBoard
          key={`${year}-${team}`}
          rows={rows}
          year={year}
          events={recentEvents}
          today={today}
          threshold={threshold}
          addHours={addHours}
        />
      </FilterBar>

      <section className="mt-10" aria-labelledby="entries">
        <h2 id="entries" className="mb-2 font-bold">
          Бичлэгүүд ({year})
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Энэ жилд бичлэг алга.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card text-sm ring-1 ring-border">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  <span className="font-semibold">{e.memberName ?? "—"}</span> · {e.hours} цаг ·{" "}
                  {formatDate("mn", e.date, "long")}
                  {(e.eventTitle || e.note) && (
                    <span className="text-muted-foreground"> · {e.eventTitle ?? e.note}</span>
                  )}
                </span>
                <ConfirmAction
                  action={deleteHoursEntry.bind(null, e.id)}
                  description="Энэ цагийн бичлэгийг устгах уу?"
                />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Арга хэмжээний ирцийг «Арга хэмжээ → Сайн дурынхан»-аас тэмдэглэхэд цаг энд автоматаар
          орно. Одоогийн хичээлийн жил: {schoolYearOf(new Date())}.{" "}
          <Link href="/admin/settings" className="underline">
            Босго тохируулах
          </Link>
        </p>
      </section>
    </>
  );
}
