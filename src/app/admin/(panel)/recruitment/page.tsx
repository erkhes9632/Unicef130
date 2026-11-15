import { count, desc } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { applications, recruitmentPeriods } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { applicationStatusLabels, countedStatuses, periodPhase } from "@/lib/recruitment/logic";
import { deletePeriod } from "./actions";

export const metadata: Metadata = { title: "Элсэлт" };

const phaseLabel = { upcoming: "Удахгүй нээгдэнэ", open: "Нээлттэй", closed: "Хаагдсан" } as const;

export default async function RecruitmentPage({ searchParams }: PageProps<"/admin/recruitment">) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const [periods, counts] = await Promise.all([
    db.select().from(recruitmentPeriods).orderBy(desc(recruitmentPeriods.opensAt)),
    db
      .select({ periodId: applications.periodId, status: applications.status, n: count() })
      .from(applications)
      .groupBy(applications.periodId, applications.status),
  ]);
  const when = (d: Date) => `${formatDate("mn", d, "long")} ${formatDate("mn", d, "time")}`;

  return (
    <>
      <AdminPageHeader
        title="Элсэлт"
        description="Элсэлтийн хугацаанд л «Гишүүн болох» маягт нээлттэй байна. Нэг үед нэг элсэлт."
        actions={
          <Button asChild>
            <Link href="/admin/recruitment/new">
              <Plus /> Элсэлт зарлах
            </Link>
          </Button>
        }
      />
      {sp.saved === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-brand-green-soft p-3 text-sm font-medium">
          Хадгалагдлаа.
        </p>
      )}
      {periods.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          Одоогоор элсэлт зарлаагүй байна — «Гишүүн болох» хуудас «Элсэлт хаалттай» гэж харагдана.
        </p>
      ) : (
        <ul className="space-y-3">
          {periods.map((p) => {
            const phase = periodPhase(p);
            const own = counts.filter((c) => c.periodId === p.id);
            const taken = own
              .filter((c) => countedStatuses.includes(c.status))
              .reduce((s, c) => s + c.n, 0);
            return (
              <li key={p.id} className="rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      <Link href={`/admin/recruitment/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                      <Badge variant={phase === "open" ? "default" : "secondary"}>
                        {phaseLabel[phase]}
                      </Badge>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {when(p.opensAt)} — {when(p.closesAt)} · {p.schoolYear.replace("-", "–")}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Орон: {taken}
                        {p.capacity !== null ? ` / ${p.capacity}` : " (хязгааргүй)"}
                      </span>
                      {own.map((c) => (
                        <span key={c.status}>
                          {applicationStatusLabels[c.status]}: {c.n}
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/applications?period=${p.id}`}>Өргөдлүүд</Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`Засах: ${p.name}`}>
                      <Link href={`/admin/recruitment/${p.id}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    <ConfirmAction
                      action={deletePeriod.bind(null, p.id)}
                      description={`«${p.name}» элсэлтийг устгах уу? Өргөдлүүд устахгүй.`}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
