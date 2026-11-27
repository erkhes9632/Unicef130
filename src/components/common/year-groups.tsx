"use client";

import { displayYear, groupByYear } from "@/lib/school-year";
import { cn } from "@/lib/utils";

export type YearLabels = {
  /** "Хичээлийн жил" (chip row name for screen readers) */
  label: string;
  /** "Бүгд" */
  all: string;
  /** "{year} хичээлийн жил" */
  heading: string;
  /** "{year} хичээлийн жил (үргэлжлэл)" — a year that started on the previous page */
  continued: string;
};

const fill = (template: string, year: string) => template.replace("{year}", displayYear(year));

/** The `?year=` value when it is one of `years`, else "" (= every year). */
export function pickYear(value: string | null, years: readonly string[]) {
  return value && years.includes(value) ? value : "";
}

const chip = (active: boolean) =>
  cn(
    "inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-semibold whitespace-nowrap ring-1 ring-border transition-colors hover:bg-muted",
    active && "bg-brand-green text-brand-ink ring-brand-green hover:bg-brand-green",
  );

/**
 * "Бүгд · 2026–2027 · 2025–2026": filters a cached list by school year (?year=). Hidden when
 * there is only one year (a filter with one option says nothing). Links work without JS.
 */
export function YearChips({
  years,
  active,
  labels,
  href,
  onPick,
}: {
  /** Years that have items, newest first. */
  years: readonly string[];
  active: string;
  labels: YearLabels;
  href: (year: string) => string;
  onPick: (year: string) => (e: React.MouseEvent) => void;
}) {
  if (years.length < 2) return null;
  return (
    <nav aria-label={labels.label} className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {["", ...years].map((y) => (
          <li key={y || "all"}>
            <a
              href={href(y)}
              onClick={onPick(y)}
              className={chip(active === y)}
              aria-current={active === y ? "page" : undefined}
            >
              {y ? displayYear(y) : labels.all}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Items (already newest first) under one heading per school year. `before` = the item just
 * before this page, so a year that continues from the previous page says "(үргэлжлэл)" and a
 * heading never repeats on one page.
 */
export function YearGroups<T extends { id: string; year: string }>({
  items,
  before,
  labels,
  render,
  className,
  as: Heading = "h2",
}: {
  items: readonly T[];
  before?: T;
  labels: YearLabels;
  render: (list: T[]) => React.ReactNode;
  className?: string;
  /** Heading level (h3 under another section heading). */
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("space-y-10", className)}>
      {groupByYear(items, (i) => i.year).map((g, i) => (
        <section key={g.year} aria-labelledby={`year-${g.year}`}>
          <Heading
            id={`year-${g.year}`}
            className="mb-5 flex items-center gap-3 text-xl font-extrabold sm:text-2xl"
          >
            <span>
              {fill(i === 0 && before?.year === g.year ? labels.continued : labels.heading, g.year)}
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
          </Heading>
          {render(g.items)}
        </section>
      ))}
    </div>
  );
}
