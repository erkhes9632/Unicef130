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
import { NativeSelect } from "@/components/admin/form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { applications, applicationStatuses, recruitmentPeriods, users } from "@/db/schema";
import { helpOptionLabels } from "@/lib/admin/labels";
import { isSheetsConfigured } from "@/lib/applications/sheets-sync";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import { parseApplicationFilters, queryApplications } from "@/lib/recruitment/admin-query";
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

const PAGE_SIZE = 25;

export default async function AdminApplicationsPage({
  searchParams,
}: PageProps<"/admin/applications">) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseApplicationFilters(sp);
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);

  const db = await getDb();
  const periodWhere =
    filters.period === "none"
      ? isNull(applications.periodId)
      : filters.period
        ? eq(applications.periodId, filters.period)
        : undefined;
  const [matched, counts, periods, classes, sheetsOn, settings] = await Promise.all([
    queryApplications(filters),
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

  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = matched.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
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
            <p className="text-xs text-destructive">Sheets алдаа: {a.sheetsError}</p>
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
                  filters.status === t.value && "bg-brand-cyan text-brand-night ring-brand-cyan",
                )}
              >
                {t.label} <span className="text-xs opacity-70">{t.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form className="mb-6 grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:grid-cols-2 lg:grid-cols-6">
        <input type="hidden" name="status" value={filters.status} />
        <label className="space-y-1 text-xs font-semibold lg:col-span-2">
          <span>Хайх (нэр, утас, и-мэйл)</span>
          <Input name="q" defaultValue={filters.q} placeholder="Анужин / 8811 / name@gmail.com" />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Элсэлт</span>
          <NativeSelect name="period" defaultValue={filters.period}>
            <option value="">Бүгд</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="none">Элсэлтгүй (хуучин)</option>
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Анги</span>
          <NativeSelect name="class" defaultValue={filters.className}>
            <option value="">Бүгд</option>
            {classes
              .map((c) => c.c)
              .sort((a, b) => a.localeCompare(b, "mn", { numeric: true }))
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Эхлэх огноо</span>
          <Input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Дуусах огноо</span>
          <Input type="date" name="to" defaultValue={filters.to} />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          <span>Эрэмбэ</span>
          <NativeSelect name="sort" defaultValue={filters.sort}>
            <option value="new">Шинэ нь эхэндээ</option>
            <option value="old">Хуучин нь эхэндээ</option>
            <option value="class">Ангиар</option>
          </NativeSelect>
        </label>
        <div className="flex items-end gap-2 lg:col-span-2">
          <Button type="submit">Шүүх</Button>
          <Button asChild variant="ghost">
            <Link href="/admin/applications">Цэвэрлэх</Link>
          </Button>
        </div>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">
        {matched.length} өргөдөл{pageCount > 1 ? ` · ${current} / ${pageCount}-р хуудас` : ""}
      </p>
      {rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          Энэ шүүлтүүрт тохирох өргөдөл алга.
        </p>
      ) : (
        <ApplicationsList
          key={`${current}-${filters.status}-${matched.length}`}
          items={items}
          bulkSetStatus={bulkSetStatus}
        />
      )}
      {pageCount > 1 && (
        <nav aria-label="Хуудаслалт" className="mt-4 flex items-center justify-between text-sm">
          {current > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href({ page: String(current - 1) })}>← Өмнөх</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {current} / {pageCount}
          </span>
          {current < pageCount ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href({ page: String(current + 1) })}>Дараах →</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
