import { count, desc, eq } from "drizzle-orm";
import { CheckCircle2, CircleDashed, Download, Mail, Phone, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ApplicationNotesForm,
  ApplicationStatusSelect,
  RetrySyncButton,
} from "@/components/admin/application-controls";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { applications, applicationStatuses, type ApplicationStatus } from "@/db/schema";
import { applicationStatusLabel, helpOptionLabels } from "@/lib/admin/labels";
import { getSiteSettings } from "@/lib/data/settings";
import { isSheetsConfigured } from "@/lib/applications/sheets-sync";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { cn } from "@/lib/utils";
import {
  deleteApplication,
  retryApplicationSync,
  saveApplicationNotes,
  setApplicationStatus,
} from "./actions";

export const metadata: Metadata = { title: "Өргөдлүүд" };

export default async function AdminApplicationsPage({
  searchParams,
}: PageProps<"/admin/applications">) {
  const me = await requireUser();
  const sp = await searchParams;
  const status = applicationStatuses.includes(sp.status as ApplicationStatus)
    ? (sp.status as ApplicationStatus)
    : undefined;
  const db = await getDb();
  const [rows, counts, sheetsOn] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(status ? eq(applications.status, status) : undefined)
      .orderBy(desc(applications.createdAt))
      .limit(500),
    db
      .select({ status: applications.status, n: count() })
      .from(applications)
      .groupBy(applications.status),
    isSheetsConfigured(),
  ]);
  const helpOptionLabel = helpOptionLabels((await getSiteSettings()).helpOptions);
  const countBy = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>;
  const total = counts.reduce((a, c) => a + c.n, 0);
  const tabs = [
    { value: "", label: "Бүгд", n: total },
    ...applicationStatuses.map((s) => ({
      value: s,
      label: applicationStatusLabel[s],
      n: countBy[s] ?? 0,
    })),
  ];

  return (
    <>
      <AdminPageHeader
        title="Гишүүнчлэлийн өргөдлүүд"
        description={
          sheetsOn
            ? "Шинэ өргөдөл Google Sheets-д автоматаар нэмэгдэнэ."
            : "Google Sheets тохируулагдаагүй — өргөдлүүд зөвхөн энд хадгалагдана."
        }
        actions={
          <Button asChild variant="outline">
            <a href={`/admin/applications/export${status ? `?status=${status}` : ""}`}>
              <Download /> CSV татах
            </a>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/admin/applications?status=${t.value}` : "/admin/applications"}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-border",
              (status ?? "") === t.value && "bg-brand-cyan text-brand-night ring-brand-cyan",
            )}
          >
            {t.label} <span className="opacity-70">({t.n})</span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
          Өргөдөл алга.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">
                    {a.fullName} <Badge variant="secondary">{a.className}</Badge>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <a
                      href={`tel:${a.phone}`}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <Phone className="size-3.5" /> {a.phone}
                    </a>
                    {a.email && (
                      <a
                        href={`mailto:${a.email}`}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Mail className="size-3.5" /> {a.email}
                      </a>
                    )}
                    <span>
                      {formatDate("mn", a.createdAt, "long")}{" "}
                      {formatDate("mn", a.createdAt, "time")}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ApplicationStatusSelect
                    value={a.status}
                    action={setApplicationStatus.bind(null, a.id)}
                  />
                  {me.role === "admin" && (
                    <ConfirmAction
                      action={deleteApplication.bind(null, a.id)}
                      description={`${a.fullName}-ийн өргөдөл болон хувийн мэдээллийг бүрмөсөн устгах уу?`}
                    />
                  )}
                </div>
              </div>
              <p className="rounded-xl bg-muted/50 p-3 text-sm whitespace-pre-line">{a.reason}</p>
              <div className="flex flex-wrap gap-1.5">
                {a.helpWith.map((h) => (
                  <Badge key={h} variant="outline">
                    {helpOptionLabel[h] ?? h}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {a.sheetsSyncedAt ? (
                  <span className="inline-flex items-center gap-1 text-brand-green-strong">
                    <CheckCircle2 className="size-4" /> Google Sheets-д нэмэгдсэн
                  </span>
                ) : a.sheetsError ? (
                  <span
                    className="inline-flex items-center gap-1 text-destructive"
                    title={a.sheetsError}
                  >
                    <TriangleAlert className="size-4" /> Sheets sync алдаа:{" "}
                    {a.sheetsError.slice(0, 80)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <CircleDashed className="size-4" />{" "}
                    {sheetsOn ? "Sync хийгдээгүй" : "Sheets тохируулаагүй"}
                  </span>
                )}
                {sheetsOn && !a.sheetsSyncedAt && (
                  <RetrySyncButton action={retryApplicationSync.bind(null, a.id)} />
                )}
              </div>
              <ApplicationNotesForm
                notes={a.notes}
                action={saveApplicationNotes.bind(null, a.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
