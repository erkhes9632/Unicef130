import { count, desc, eq, inArray, isNull } from "drizzle-orm";
import { Ban, Download, Mail, Phone, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ApplicationNotesForm,
  ApplicationStatusSelect,
  ApplyBlockToggle,
  DecisionMessageForm,
  RetrySyncButton,
} from "@/components/admin/application-controls";
import { ApplicationsList } from "@/components/admin/applications-list";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Pager } from "@/components/admin/pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { applications, applicationStatuses, recruitmentPeriods, users } from "@/db/schema";
import { helpOptionLabels } from "@/lib/admin/labels";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { pageOffset, pageParam } from "@/lib/admin/list-query";
import { isSheetsConfigured } from "@/lib/applications/sheets-sync";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import {
  applicationOrder,
  applicationWhere,
  parseApplicationFilters,
} from "@/lib/recruitment/admin-query";
import { applicationStatusLabels } from "@/lib/recruitment/logic";
import { cn } from "@/lib/utils";
import {
  bulkSetStatus,
  deleteApplication,
  retryApplicationSync,
  saveApplicationNotes,
  saveDecisionMessage,
  setApplicationStatus,
  setApplyBlocked,
} from "./actions";

export const metadata: Metadata = { title: "Өргөдлүүд" };

export default async function AdminApplicationsPage({
  searchParams,
}: PageProps<"/admin/applications">) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseApplicationFilters(sp);
  const page = pageParam(sp);

  const db = await getDb();
  const periodWhere =
    filters.period === "none"
      ? isNull(applications.periodId)
      : filters.period
        ? eq(applications.periodId, filters.period)
        : undefined;
  const where = applicationWhere(filters);
  const [[matchedCount], rows, counts, periods, classes, sheetsOn, settings] = await Promise.all([
    db.select({ n: count() }).from(applications).where(where),
    db
      .select()
      .from(applications)
      .where(where)
      .orderBy(...applicationOrder(filters))
      .limit(PAGE_SIZE)
      .offset(pageOffset(page)),
    db
      .select({ status: applications.status, n: count() })
      .from(applications)
      .where(periodWhere)
      .groupBy(applications.status),
    db
      .select({
        id: recruitmentPeriods.id,
        name: recruitmentPeriods.name,
        questions: recruitmentPeriods.questions,
      })
      .from(recruitmentPeriods)
      .orderBy(desc(recruitmentPeriods.opensAt)),
    db.selectDistinct({ c: applications.className }).from(applications),
    isSheetsConfigured(),
    getSiteSettings(),
  ]);
  const helpLabel = helpOptionLabels(settings.helpOptions);
  const periodName = new Map(periods.map((p) => [p.id, p.name]));
  const questionLabel = new Map(
    periods.flatMap((p) => p.questions.map((q) => [q.id, q.label] as const)),
  );
  const countBy = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>;
  const total = counts.reduce((a, c) => a + c.n, 0);

  const matched = matchedCount?.n ?? 0;
  // Account flags for the rows on this page (applications sent before sign-in have none).
  const accountIds = [...new Set(rows.flatMap((r) => (r.userId ? [r.userId] : [])))];
  const accounts = accountIds.length
    ? await db
        .select({ id: users.id, applyBlocked: users.applyBlocked, role: users.role })
        .from(users)
        .where(inArray(users.id, accountIds))
    : [];
  const accountOf = new Map(accounts.map((a) => [a.id, a]));

  const href = (overrides: Record<string, string>) => {
    const q = new URLSearchParams(
      Object.entries({
        period: filters.period,
        status: filters.status,
        class: filters.className,
        from: filters.from,
        to: filters.to,
        q: filters.q,
        sort: filters.sort === "new" ? "" : filters.sort,
        ...overrides,
      }).filter(([, v]) => v),
    );
    return `/admin/applications${q.size ? `?${q}` : ""}`;
  };
  const exportHref = href({}).replace("/admin/applications", "/admin/applications/export");
  const tabs = [
    { value: "", label: "Бүгд", n: total },
    ...applicationStatuses.map((s) => ({
      value: s,
      label: applicationStatusLabels[s],
      n: countBy[s] ?? 0,
    })),
  ];
  const when = (d: Date) => `${formatDate("mn", d, "long")} ${formatDate("mn", d, "time")}`;

  const items = rows.map((a) => ({
    id: a.id,
    label: a.fullName,
    content: (
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
          <span className="font-bold">{a.fullName}</span>
          <Badge variant="secondary">{a.className}</Badge>
          <Badge variant="outline">{applicationStatusLabels[a.status]}</Badge>
          {!a.userId && <span className="text-xs text-muted-foreground">хуучин (бүртгэлгүй)</span>}
          {a.userId && accountOf.get(a.userId)?.applyBlocked && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
              <Ban className="size-3.5" aria-hidden="true" /> өргөдөл гаргахыг хориглосон
            </span>
          )}
          {a.memberId && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green-strong">
              <UserCheck className="size-3.5" aria-hidden="true" /> гишүүн үүссэн
            </span>
          )}
          <time
            className="ml-auto text-xs text-muted-foreground"
            dateTime={a.createdAt.toISOString()}
          >
            {when(a.createdAt)}
          </time>
        </summary>

        <div className="mt-3 space-y-3 border-t pt-3 text-sm">
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 hover:underline">
              <Phone className="size-3.5" aria-hidden="true" /> {a.phone}
            </a>
            {a.email && (
              <a
                href={`mailto:${a.email}`}
                className="inline-flex items-center gap-1 break-all hover:underline"
              >
                <Mail className="size-3.5" aria-hidden="true" /> {a.email}
              </a>
            )}
            {a.periodId && (
              <span className="text-muted-foreground">
                {periodName.get(a.periodId) ?? "Устгагдсан элсэлт"}
              </span>
            )}
          </p>
          <p className="whitespace-pre-line">{a.reason}</p>
          <div className="flex flex-wrap gap-1.5">
            {a.helpWith.map((h) => (
              <Badge key={h} variant="outline">
                {helpLabel[h] ?? h}
              </Badge>
            ))}
          </div>
          {Object.keys(a.answers).length > 0 && (
            <dl className="space-y-1 rounded-xl bg-muted/50 p-3 text-xs">
              {Object.entries(a.answers).map(([key, value]) => (
                <div key={key} className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold">{questionLabel.get(key) ?? key}:</dt>
                  <dd>{typeof value === "boolean" ? (value ? "Тийм" : "Үгүй") : value || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ApplicationStatusSelect
              value={a.status}
              action={setApplicationStatus.bind(null, a.id)}
            />
            {a.memberId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/members/${a.memberId}`}>Гишүүний бүртгэл</Link>
              </Button>
            )}
            {sheetsOn && !a.sheetsSyncedAt && (
              <RetrySyncButton action={retryApplicationSync.bind(null, a.id)} />
            )}
            {a.userId && (
              <ApplyBlockToggle
                blocked={accountOf.get(a.userId)?.applyBlocked ?? false}
                action={setApplyBlocked.bind(null, a.userId)}
              />
            )}
            <ConfirmAction
              action={deleteApplication.bind(null, a.id)}
              description="Энэ өргөдлийг (хувийн мэдээллийн хамт) бүрмөсөн устгах уу?"
            />
          </div>
          {a.sheetsError && (
            <p className="text-xs text-destructive">
              Google Sheets руу хуулж чадсангүй: {a.sheetsError}
            </p>
          )}
          {a.userId && (
            <DecisionMessageForm
              message={a.decisionMessage}
              action={saveDecisionMessage.bind(null, a.id)}
            />
          )}
          <ApplicationNotesForm notes={a.notes} action={saveApplicationNotes.bind(null, a.id)} />
        </div>
      </details>
    ),
  }));

  return (
    <>
      <AdminPageHeader
        title="Өргөдлүүд"
        description="Элсэлтийн өргөдлүүд (хувийн мэдээлэл — зөвхөн админ харна). «Тэнцсэн» болгоход гишүүний эрх автоматаар олгогдоно. Тэнцээгүй өргөдлийг элсэлт хаагдсанаас хойш тохиргоонд заасан хугацааны дараа автоматаар устгана."
        actions={
          <Button asChild variant="outline">
            <a href={exportHref}>
              <Download /> CSV татах
            </a>
          </Button>
        }
      />

      <nav aria-label="Төлөв" className="-mx-4 mb-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {tabs.map((t) => (
            <li key={t.value}>
              <Link
                href={href({ status: t.value, page: "" })}
                aria-current={filters.status === t.value ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-border hover:bg-muted",
                  filters.status === t.value && "bg-brand-cyan text-brand-ink ring-brand-cyan",
                )}
              >
                {t.label} <span className="text-xs opacity-70">{t.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <FilterBar
        search={{
          label: "Хайх (нэр, утас, и-мэйл)",
          placeholder: "Анужин / 8811 / name@gmail.com",
        }}
        fields={[
          {
            type: "select",
            name: "period",
            label: "Элсэлт",
            options: [
              { value: "", label: "Бүгд" },
              ...periods.map((p) => ({ value: p.id, label: p.name })),
              { value: "none", label: "Элсэлтгүй (хуучин)" },
            ],
          },
          {
            type: "select",
            name: "class",
            label: "Анги",
            options: [
              { value: "", label: "Бүгд" },
              ...classes
                .map((c) => c.c)
                .sort((a, b) => a.localeCompare(b, "mn", { numeric: true }))
                .map((c) => ({ value: c, label: c })),
            ],
          },
          { type: "date", name: "from", label: "Эхлэх огноо" },
          { type: "date", name: "to", label: "Дуусах огноо" },
          {
            type: "select",
            name: "sort",
            label: "Эрэмбэ",
            options: [
              { value: "", label: "Шинэ нь эхэндээ" },
              { value: "old", label: "Хуучин нь эхэндээ" },
              { value: "class", label: "Ангиар" },
            ],
          },
        ]}
        alsoClear={["status"]}
        count={matched}
        noun="өргөдөл"
        emptyText="Энэ шүүлтүүрт тохирох өргөдөл алга."
      >
        {rows.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            Өргөдөл хараахан ирээгүй байна.
          </p>
        ) : (
          <ApplicationsList
            key={`${page}-${filters.status}-${matched}`}
            items={items}
            bulkSetStatus={bulkSetStatus}
          />
        )}
        <Pager path="/admin/applications" params={sp} page={page} total={matched} />
      </FilterBar>
    </>
  );
}
