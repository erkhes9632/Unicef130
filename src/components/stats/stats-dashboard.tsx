"use client";

import { CircleAlert, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { BarChart, StackedBar } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { Funnel } from "@/components/charts/funnel";
import { LineChart } from "@/components/charts/line-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { Button } from "@/components/ui/button";
import { useUrlQuery } from "@/hooks/use-url-query";
import { formatDate, formatNumber } from "@/lib/dates/format";
import { changePct, parsePeriod, PERIODS, type PeriodKey } from "@/lib/stats/period";
import { fromFirstNonZero } from "@/lib/stats/ticks";
import type { Count, StatsResponse } from "@/lib/stats/types";
import { cn } from "@/lib/utils";

const PERIOD_LABEL: Record<PeriodKey, string> = {
  "24h": "24 цаг",
  "7d": "7 хоног",
  "30d": "30 хоног",
  "90d": "90 хоног",
  year: "Энэ хичээлийн жил",
};
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--brand-coral)",
];
const fmt = (n: number) => formatNumber(Math.round(n));
const fmt1 = (n: number) => n.toFixed(1);

/** Friendly names for the site's main pages (others show their address). */
const PAGE_NAMES: Record<string, string> = {
  "/": "Нүүр",
  "/about": "Бидний тухай",
  "/impact": "Үр дүн",
  "/news": "Мэдээ",
  "/events": "Арга хэмжээ",
  "/gallery": "Зургийн цомог",
  "/members": "Гишүүд",
  "/join": "Гишүүн болох",
  "/support": "Дэмжих",
  "/faq": "Түгээмэл асуулт",
  "/privacy": "Нууцлалын бодлого",
  "/sign-in": "Нэвтрэх",
};
const DEVICE: Record<string, string> = { mobile: "Утас", desktop: "Компьютер", tablet: "Таблет" };

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["mn"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** "2026-11-21" → "11/21", "2026-11-21T14" → "14:00". */
const shortKey = (k: string) =>
  k.length > 10 ? `${k.slice(11, 13)}:00` : `${k.slice(5, 7)}/${k.slice(8, 10)}`;
const longKey = (k: string) =>
  k.length > 10
    ? `${formatDate("mn", Date.parse(`${k.slice(0, 10)}T12:00:00+08:00`), "long")}, ${k.slice(11, 13)}:00`
    : formatDate("mn", Date.parse(`${k}T12:00:00+08:00`), "long");
const monthLabel = (k: string) =>
  formatDate("mn", Date.parse(`${k}-15T12:00:00+08:00`), "monthYear");

function Change({ cur, prev }: { cur: number; prev: number }) {
  const pct = changePct(cur, prev);
  if (pct === null)
    return <span className="text-xs text-muted-foreground">өмнөхтэй харьцуулах мэдээлэл алга</span>;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "text-xs font-semibold",
        up ? "text-brand-green-strong" : "text-brand-coral-strong",
      )}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span> {Math.abs(pct).toFixed(1)}%{" "}
      <span className="font-normal text-muted-foreground">
        {up ? "өссөн" : "буурсан"} (өмнөх ижил хугацаанаас)
      </span>
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  cur,
  prev,
  trend,
}: {
  label: string;
  /** null = the source isn't connected (Web Analytics). */
  value: string | null;
  hint: string;
  cur?: number;
  prev?: number;
  trend?: number[];
}) {
  return (
    <li className="flex flex-col gap-1 rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      {value === null ? (
        // Web Analytics not set up yet: one calm word, the notice below says the rest.
        <p className="py-2 text-sm font-semibold text-muted-foreground">Холбогдоогүй</p>
      ) : (
        <p className="font-heading text-3xl font-extrabold tabular-nums">{value}</p>
      )}
      {cur !== undefined && prev !== undefined && <Change cur={cur} prev={prev} />}
      {trend && <Sparkline values={trend} className="mt-1 h-7 w-full" />}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </li>
  );
}

type Vital = {
  name: string;
  hint: string;
  value: number;
  good: number;
  poor: number;
  show: (v: number) => string;
};

function SpeedBadge({ v }: { v: Vital }) {
  const level = v.value <= v.good ? "fast" : v.value <= v.poor ? "ok" : "slow";
  const text = { fast: "Хурдан", ok: "Дунд", slow: "Удаан" }[level];
  const tone = {
    fast: "bg-brand-green-soft text-brand-green-strong",
    ok: "bg-brand-gold-soft text-brand-gold-strong",
    slow: "bg-brand-coral-soft text-brand-coral-strong",
  }[level];
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-4">
      <div>
        <p className="font-semibold">{v.name}</p>
        <p className="text-xs text-muted-foreground">{v.hint}</p>
      </div>
      <p className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-bold", tone)}>
        {text}
        {v.show(v.value) && <span className="ml-1 font-normal">· {v.show(v.value)}</span>}
      </p>
    </li>
  );
}

const counts = (list: Count[], name: (s: string) => string = (s) => s) =>
  list.map((c) => ({ label: name(c.label), value: c.value }));
const parts = (list: Count[], name: (s: string) => string = (s) => s) =>
  list.map((c, i) => ({ name: name(c.label), value: c.value, color: COLORS[i % COLORS.length]! }));

/**
 * The statistics part of the dashboard, drawn in the browser from /api/admin/stats (aggregates
 * only). The status line and the to-do list are rendered by the server page above it.
 */
export function StatsDashboard() {
  const { query, setQuery } = useUrlQuery();
  const period = parsePeriod(query.get("period") ?? undefined);
  // Result per period: while the selected period has no result yet, the page shows skeletons.
  const [result, setResult] = useState<{ period: PeriodKey; data: StatsResponse | null }>();

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/admin/stats?period=${period}`, { signal: ctrl.signal })
      .then((r) =>
        r.ok ? (r.json() as Promise<StatsResponse>) : Promise.reject(new Error(String(r.status))),
      )
      .then((data) => setResult({ period, data }))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setResult({ period, data: null });
      });
    return () => ctrl.abort();
  }, [period]);

  const current = result?.period === period ? result : undefined;
  const data = current?.data ?? null;
  const failed = !!current && !current.data;
  const loading = !data && !failed;
  const t = data?.traffic ?? null;
  const c = data?.club;
  const noTraffic = !!data && !t;

  // Top pages: Mongolian and English versions of the same page side by side.
  const pages = new Map<string, { mn: number; en: number }>();
  for (const p of t?.pages ?? []) {
    const en = p.path === "/en" || p.path.startsWith("/en/");
    const path = en ? p.path.slice(3) || "/" : p.path;
    const row = pages.get(path) ?? { mn: 0, en: 0 };
    row[en ? "en" : "mn"] += p.views;
    pages.set(path, row);
  }
  const pageItems = [...pages]
    .map(([path, v]) => ({
      label: PAGE_NAMES[path] ?? path,
      value: v.mn + v.en,
      parts: [
        { name: "Монгол", value: v.mn, color: "var(--chart-1)" },
        { name: "Англи", value: v.en, color: "var(--chart-2)" },
      ],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Sign-ups from the first one on (weeks of flat zero before it say nothing).
  const growth = c ? fromFirstNonZero(c.users.growth) : [];

  const funnel = c
    ? (() => {
        const s = c.applications.byStatus;
        const total = Object.values(s).reduce((a, b) => a + b, 0);
        return [
          { label: "Ирсэн өргөдөл", value: total, color: "var(--chart-1)" },
          { label: "Хянагдсан", value: total - s.new, color: "var(--chart-2)" },
          {
            label: "Шийдвэр гарсан",
            value: s.accepted + s.rejected + s.waitlist,
            color: "var(--chart-5)",
          },
          { label: "Элссэн", value: s.accepted, color: "var(--chart-3)" },
        ];
      })()
    : [];

  const vitals: Vital[] = t?.vitals
    ? [
        {
          name: "Хуудас нээгдэх хурд",
          hint: "Гол агуулга дэлгэцэнд гарах хүртэлх хугацаа.",
          value: t.vitals.lcp,
          good: 2.5,
          poor: 4,
          show: (v) => `${v.toFixed(1)} сек`,
        },
        {
          name: "Товч дарахад хариу өгөх хурд",
          hint: "Товч, цэс дарахад сайт хэр хурдан хариулах вэ.",
          value: t.vitals.inp,
          good: 0.2,
          poor: 0.5,
          show: (v) => `${Math.round(v * 1000)} мс`,
        },
        {
          name: "Хуудас үсрэлтгүй байх",
          hint: "Уншиж байхад агуулга гэнэт хөдлөх эсэх.",
          value: t.vitals.cls,
          good: 0.1,
          poor: 0.25,
          show: () => "",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {failed && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-brand-coral-soft p-4 font-semibold"
        >
          <CircleAlert className="size-5 text-brand-coral-strong" aria-hidden="true" />
          Статистикийг ачаалж чадсангүй. Хуудсыг дахин ачаалаад үзээрэй.
        </p>
      )}

      {/* 2. Period */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Хугацаа" className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p}
              type="button"
              variant={p === period ? "default" : "outline"}
              aria-pressed={p === period}
              onClick={() => setQuery({ period: p === "30d" ? undefined : p })}
            >
              {PERIOD_LABEL[p]}
            </Button>
          ))}
        </div>
        <Button asChild variant="outline">
          <a href={`/api/admin/stats?period=${period}&format=csv`} download>
            <Download aria-hidden="true" /> CSV татах
          </a>
        </Button>
      </div>

      {/* 3. KPIs */}
      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className="sr-only">
          Гол тоонууд
        </h2>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-muted motion-safe:animate-pulse" />
            ))}
          </div>
        ) : c ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Зочид"
              value={t ? fmt(t.totals.visits) : null}
              hint="Сайтад хэдэн удаа зочилсон бэ."
              cur={t?.totals.visits}
              prev={t?.prevTotals.visits}
              trend={t?.series.map((d) => d.visits)}
            />
            <Kpi
              label="Үзсэн хуудас"
              value={t ? fmt(t.totals.views) : null}
              hint="Нийт хэдэн хуудас нээгдсэн бэ."
              cur={t?.totals.views}
              prev={t?.prevTotals.views}
              trend={t?.series.map((d) => d.views)}
            />
            <Kpi
              label="Нэг зочилтод ногдох хуудас"
              value={t ? (t.totals.visits ? fmt1(t.totals.views / t.totals.visits) : "0") : null}
              hint="Нэг удаа орохдоо дунджаар хэдэн хуудас үздэг вэ."
              cur={t && t.totals.visits ? t.totals.views / t.totals.visits : undefined}
              prev={t && t.prevTotals.visits ? t.prevTotals.views / t.prevTotals.visits : undefined}
            />
            <Kpi
              label="Шинэ хэрэглэгч"
              value={fmt(c.users.inPeriod)}
              hint={`Энэ хугацаанд бүртгүүлсэн. Нийт: ${fmt(c.users.total)}.`}
              cur={c.users.inPeriod}
              prev={c.users.prevPeriod}
            />
            <Kpi
              label="Тайлангийн идэвхтэй гишүүн"
              value={c.members.report ? fmt(c.members.report.active) : "—"}
              hint={
                c.members.report
                  ? `${c.members.report.schoolYear.replace("-", "–")} оны тайлангаас (нийт элссэн ${fmt(c.members.report.joined)}). Сайтад харагдах тоо.`
                  : "«Жилийн үр дүн» хэсэгт тайлангийн тоог оруулна."
              }
            />
            <Kpi
              label="Сайтад бүртгэлтэй гишүүн"
              value={fmt(c.members.site)}
              hint="Сайтад нэвтэрдэг, гишүүн эрхтэй хүмүүс (тайлангийн тооноос тусдаа)."
            />
            <Kpi
              label="Өргөдөл"
              value={fmt(c.applications.inPeriod)}
              hint="Энэ хугацаанд ирсэн элсэх өргөдөл."
              cur={c.applications.inPeriod}
              prev={c.applications.prevPeriod}
            />
            <Kpi
              label="Сайтад бүртгэсэн цаг"
              value={fmt(c.hours.inPeriod)}
              hint={
                c.members.report
                  ? `Энэ хугацаанд «Сайн дурын цаг» хэсэгт бүртгэсэн. Тайлангийн ${fmt(c.members.report.hours)} цаг тусдаа.`
                  : "Энэ хугацаанд «Сайн дурын цаг» хэсэгт бүртгэсэн."
              }
              cur={c.hours.inPeriod}
              prev={c.hours.prevPeriod}
            />
          </ul>
        ) : null}
      </section>

      {noTraffic && (
        <p className="rounded-2xl bg-muted/50 p-5 text-center text-muted-foreground">
          Зочдын тоо одоогоор холбогдоогүй байна.
        </p>
      )}

      {!noTraffic && (
        <>
          {/* 4. Visitors over time */}
          <ChartCard
            title="Зочид ба үзсэн хуудас"
            caption="Өдөр бүр (24 цагт бол цаг бүр) хэдэн зочин орж, хэдэн хуудас үзсэн бэ."
            unit="тоо"
            loading={loading}
            empty={!!t && t.totals.views === 0}
            table={
              t
                ? {
                    columns: ["Огноо", "Зочид", "Үзсэн хуудас"],
                    rows: t.series.map((d) => [longKey(d.key), fmt(d.visits), fmt(d.views)]),
                  }
                : undefined
            }
          >
            {t && (
              <LineChart
                label="Зочид ба үзсэн хуудасны график"
                labels={t.series.map((d) => shortKey(d.key))}
                longLabels={t.series.map((d) => longKey(d.key))}
                series={[
                  {
                    name: "Үзсэн хуудас",
                    color: "var(--chart-1)",
                    values: t.series.map((d) => d.views),
                  },
                  { name: "Зочид", color: "var(--chart-2)", values: t.series.map((d) => d.visits) },
                ]}
                format={fmt}
              />
            )}
          </ChartCard>

          {/* 5. Top pages */}
          <ChartCard
            title="Хамгийн их үзсэн 10 хуудас"
            caption="Аль хуудсыг хамгийн их уншиж байна вэ (монгол, англи хувилбараар)."
            unit="үзсэн удаа"
            loading={loading}
            empty={pageItems.length === 0}
            table={{
              columns: ["Хуудас", "Монгол", "Англи", "Нийт"],
              rows: pageItems.map((p) => [
                p.label,
                fmt(p.parts[0]!.value),
                fmt(p.parts[1]!.value),
                fmt(p.value),
              ]),
            }}
          >
            <BarChart items={pageItems} format={fmt} label="Хамгийн их үзсэн хуудсууд" />
          </ChartCard>

          {/* 6. Where visitors come from */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Хаанаас орж ирсэн"
              caption="Зочид аль сайтаас (Facebook, Google гэх мэт) холбоосоор дамжиж ирсэн бэ."
              unit="үзсэн удаа"
              loading={loading}
              empty={!t?.referrers.length}
              table={
                t
                  ? {
                      columns: ["Сайт", "Үзсэн"],
                      rows: t.referrers.map((r) => [r.label, fmt(r.value)]),
                    }
                  : undefined
              }
            >
              {t && <BarChart items={counts(t.referrers)} format={fmt} label="Хаанаас орж ирсэн" />}
            </ChartCard>
            <ChartCard
              title="Улс"
              caption="Зочид аль улсаас орж байна вэ (хамгийн ихтэй 8 улс; хот харуулахгүй)."
              unit="үзсэн удаа"
              loading={loading}
              empty={!t?.countries.length}
              table={
                t
                  ? {
                      columns: ["Улс", "Үзсэн"],
                      rows: t.countries.map((r) => [countryName(r.label), fmt(r.value)]),
                    }
                  : undefined
              }
            >
              {t && (
                <BarChart items={counts(t.countries, countryName)} format={fmt} label="Улсаар" />
              )}
            </ChartCard>
          </div>
          <ChartCard
            title="Төхөөрөмж, хөтөч, үйлдлийн систем"
            caption="Зочид сайтыг утас уу, компьютерээр үзэж байна уу."
            unit="хувь"
            loading={loading}
            empty={!t?.devices.length}
            table={
              t
                ? {
                    columns: ["Төрөл", "Нэр", "Үзсэн"],
                    rows: [
                      ...t.devices.map((r) => [
                        "Төхөөрөмж",
                        DEVICE[r.label] ?? r.label,
                        fmt(r.value),
                      ]),
                      ...t.browsers.map((r) => ["Хөтөч", r.label, fmt(r.value)]),
                      ...t.os.map((r) => ["Систем", r.label, fmt(r.value)]),
                    ],
                  }
                : undefined
            }
          >
            {t && (
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  ["Төхөөрөмж", parts(t.devices, (d) => DEVICE[d] ?? d)],
                  ["Хөтөч", parts(t.browsers)],
                  ["Үйлдлийн систем", parts(t.os)],
                ].map(([title, p]) => (
                  <div key={title as string}>
                    <h4 className="mb-2 text-sm font-bold">{title as string}</h4>
                    <StackedBar
                      parts={p as ReturnType<typeof parts>}
                      format={fmt}
                      label={title as string}
                    />
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* 7. Site speed */}
          <ChartCard
            title="Сайтын хурд"
            caption="Зочдын утас, компьютер дээр сайт хэр хурдан ажиллаж байна вэ (ихэнх зочны туршлага)."
            loading={loading}
            empty={!t?.vitals}
            emptyText="Хурдны мэдээлэл хангалттай цугларахаар энд гарна."
          >
            <ul className="space-y-2">
              {vitals.map((v) => (
                <SpeedBadge key={v.name} v={v} />
              ))}
            </ul>
          </ChartCard>
        </>
      )}

      {/* 8. Club numbers: two rows of equal cards (no holes on wide screens) */}
      <h2 className="pt-2 font-heading text-2xl font-extrabold">Клубын тоонууд</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Сайтын бүртгэлийн өсөлт"
          caption="Сайтад өөрсдөө бүртгүүлсэн хүмүүсийн нийт тоо (тайлангаас оруулсан гишүүдийг тоолохгүй)."
          unit="хүн"
          loading={loading}
          table={
            c
              ? {
                  columns: ["Огноо", "Бүртгэлтэй хүн"],
                  rows: growth.map((u) => [longKey(u.key), fmt(u.value)]),
                }
              : undefined
          }
        >
          {c && (
            <>
              <LineChart
                label="Сайтын бүртгэлийн өсөлт"
                labels={growth.map((d) => shortKey(d.key))}
                longLabels={growth.map((d) => longKey(d.key))}
                series={[
                  {
                    name: "Бүртгэлтэй хүн",
                    color: "var(--chart-1)",
                    values: growth.map((d) => d.value),
                  },
                ]}
                format={fmt}
                height={200}
              />
              <p className="text-sm text-muted-foreground">
                Одоо: өргөдөл гаргагч {fmt(c.users.byRole.applicant)}, гишүүн{" "}
                {fmt(c.users.byRole.member)}, админ {fmt(c.users.byRole.admin)}.
                {c.members.report && (
                  <>
                    {" "}
                    Эхлэл: {c.members.report.schoolYear.replace("-", "–")} тайлангаас{" "}
                    {fmt(c.members.report.active)} идэвхтэй гишүүн (сайтын бүртгэл биш).
                  </>
                )}
              </p>
            </>
          )}
        </ChartCard>
        <ChartCard
          title="Элсэх өргөдлийн явц"
          caption="Энэ хугацаанд ирсэн өргөдлийн хэд нь хянагдаж, шийдвэр гарч, элссэн бэ."
          unit="өргөдөл"
          loading={loading}
          empty={!!c && c.applications.inPeriod === 0}
          emptyText="Энэ хугацаанд өргөдөл ирээгүй."
          table={
            c
              ? { columns: ["Шат", "Тоо"], rows: funnel.map((f) => [f.label, fmt(f.value)]) }
              : undefined
          }
        >
          {c && (
            <>
              <Funnel steps={funnel} format={fmt} label="Өргөдлийн явц" />
              <p className="text-sm text-muted-foreground">
                Татгалзсан {fmt(c.applications.byStatus.rejected)} · Хүлээлгийн жагсаалт{" "}
                {fmt(c.applications.byStatus.waitlist)} · Ярилцлага хүлээж буй{" "}
                {fmt(c.applications.byStatus.interview)}
              </p>
            </>
          )}
        </ChartCard>
        <ChartCard
          title="Хичээлийн жилийн сайн дурын цаг"
          caption="Жил бүрийн цаг: тайлангийн албан ёсны тоо + сайтад бүртгэсэн цаг (эх сурвалжийг тус тусад нь)."
          unit="цаг"
          loading={loading}
          empty={!!c && c.hours.byYear.every((y) => y.report + y.logged === 0)}
          emptyText="Цаг хараахан алга."
          table={
            c
              ? {
                  columns: ["Хичээлийн жил", "Тайлангаас", "Сайтад бүртгэсэн", "Нийт"],
                  rows: c.hours.byYear.map((y) => [
                    y.schoolYear.replace("-", "–"),
                    fmt(y.report),
                    fmt(y.logged),
                    fmt(y.report + y.logged),
                  ]),
                }
              : undefined
          }
        >
          {c && (
            <>
              <BarChart
                items={c.hours.byYear.map((y) => ({
                  label: y.schoolYear.replace("-", "–"),
                  value: y.report + y.logged,
                  parts: [
                    { name: "Тайлангаас", value: y.report, color: "var(--chart-3)" },
                    { name: "Сайтад бүртгэсэн", value: y.logged, color: "var(--chart-1)" },
                  ],
                }))}
                format={fmt}
                label="Хичээлийн жилийн сайн дурын цаг"
              />
              <p className="text-sm text-muted-foreground">
                Сүүлийн 12 сард сайтад бүртгэсэн:{" "}
                {fmt(c.hours.byMonth.reduce((a, m) => a + m.value, 0))} цаг
                {c.hours.byMonth.some((m) => m.value > 0)
                  ? ` (${c.hours.byMonth
                      .filter((m) => m.value > 0)
                      .map((m) => `${monthLabel(m.key)}: ${fmt(m.value)}`)
                      .join(", ")}).`
                  : "."}
              </p>
            </>
          )}
        </ChartCard>
        <ChartCard
          title="Сайтын агуулга"
          caption="Сайт дээр нийтлэгдсэн агуулга."
          loading={loading}
        >
          {c && (
            <div className="space-y-4">
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Мэдээ", c.content.news],
                  ["Арга хэмжээ", c.content.events],
                  ["Цомог", c.content.albums],
                  ["Зураг", c.content.photos],
                ].map(([l, v]) => (
                  <li key={l as string} className="rounded-xl bg-muted/50 p-4">
                    <p className="font-heading text-2xl font-extrabold tabular-nums">
                      {fmt(v as number)}
                    </p>
                    <p className="text-muted-foreground">{l as string}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Энэ хугацаанд арга хэмжээнд {fmt(c.signups.inPeriod)} удаа бүртгүүлсэн.
              </p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
