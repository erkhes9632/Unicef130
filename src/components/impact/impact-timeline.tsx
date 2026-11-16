"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type TimelineSdg = { n: number; label: string; color: string; light: boolean };
export type TimelineItem = {
  id: string;
  href: string;
  title: string;
  dateTime: string;
  dateLabel: string;
  monthKey: string;
  monthLabel: string;
  direction: string | null;
  directionLabel: string | null;
  sdgs: TimelineSdg[];
};

const directionTone: Record<string, { dot: string; chip: string; active: string }> = {
  activity: {
    dot: "bg-brand-cyan",
    chip: "bg-brand-cyan-soft text-brand-cyan-strong",
    active: "bg-brand-cyan text-brand-night ring-brand-cyan",
  },
  education: {
    dot: "bg-brand-purple",
    chip: "bg-brand-purple-soft text-brand-purple-strong",
    active: "bg-brand-purple text-white ring-brand-purple",
  },
  charity: {
    dot: "bg-brand-gold",
    chip: "bg-brand-gold-soft text-brand-gold-strong",
    active: "bg-brand-gold text-brand-night ring-brand-gold",
  },
};

/**
 * The year's activities grouped by month, filterable by direction. One column on phones; on
 * wide screens the cards alternate around a centre line that draws itself while scrolling.
 */
export function ImpactTimeline({
  items,
  filters,
  labels,
}: {
  items: TimelineItem[];
  /** Directions present in the items, in display order, plus a pre-formatted count each. */
  filters: { key: string; label: string; count: string }[];
  labels: { all: string; allCount: string; filter: string; sdgs: string };
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const shown = filter ? items.filter((i) => i.direction === filter) : items;
  const groups: { key: string; label: string; items: TimelineItem[] }[] = [];
  for (const item of shown) {
    const last = groups.at(-1);
    if (last?.key === item.monthKey) last.items.push(item);
    else groups.push({ key: item.monthKey, label: item.monthLabel, items: [item] });
  }
  const countLabel = filter
    ? (filters.find((f) => f.key === filter)?.count ?? "")
    : labels.allCount;

  return (
    <div>
      {filters.length > 1 && (
        <div role="group" aria-label={labels.filter} className="mb-10 flex flex-wrap gap-2">
          {[{ key: null, label: labels.all }, ...filters].map((f) => {
            const active = f.key === filter;
            return (
              <button
                key={f.key ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  !active && "ring-border hover:bg-muted",
                  active &&
                    (f.key
                      ? directionTone[f.key]?.active
                      : "bg-foreground text-background ring-foreground"),
                )}
              >
                {f.key && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 rounded-full",
                      active ? "bg-current" : directionTone[f.key]?.dot,
                    )}
                  />
                )}
                {f.label}
              </button>
            );
          })}
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {countLabel}
      </p>

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute top-2 bottom-2 left-[7px] w-0.5 overflow-hidden rounded-full bg-border lg:left-1/2 lg:-translate-x-1/2"
        >
          <div className="draw-line size-full bg-linear-to-b from-brand-cyan via-brand-purple to-brand-gold" />
        </div>

        {groups.map((g) => (
          <section key={g.key} aria-label={g.label} className="relative mb-6 last:mb-0">
            <div className="mb-4 flex pl-8 lg:justify-center lg:pl-0">
              <h3 className="relative rounded-full bg-background px-4 py-1 text-sm font-bold ring-1 ring-border">
                {g.label}
              </h3>
            </div>
            <ol className="space-y-4 lg:space-y-2">
              {g.items.map((a, i) => {
                const tone = a.direction ? directionTone[a.direction] : undefined;
                const right = i % 2 === 1;
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "reveal relative pl-8 lg:w-1/2 lg:pl-0",
                      right ? "lg:ml-auto lg:pl-10" : "lg:pr-10",
                      // Wide screens: cards on opposite sides overlap vertically (staggered).
                      i > 0 && "lg:-mt-12",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-6 left-0 size-4 rounded-full ring-4 ring-background",
                        right ? "lg:-left-2" : "lg:right-[-0.5rem] lg:left-auto",
                        tone?.dot ?? "bg-brand-cyan",
                      )}
                    />
                    <article className="group relative rounded-2xl bg-card p-4 ring-1 ring-border transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
                      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <time dateTime={a.dateTime}>{a.dateLabel}</time>
                        {a.directionLabel && (
                          <span
                            className={cn("rounded-full px-2 py-0.5 font-semibold", tone?.chip)}
                          >
                            {a.directionLabel}
                          </span>
                        )}
                      </p>
                      <h4 className="mt-1 font-heading font-bold sm:text-lg">
                        <Link
                          href={a.href}
                          className="after:absolute after:inset-0 hover:text-brand-cyan-strong"
                        >
                          {a.title}
                        </Link>
                      </h4>
                      {a.sdgs.length > 0 && (
                        <ul
                          aria-label={labels.sdgs}
                          className="relative z-10 mt-2 flex flex-wrap gap-1.5"
                        >
                          {a.sdgs.map((s) => (
                            <li key={s.n}>
                              <Link
                                href={{ pathname: "/news", query: { sdg: String(s.n) } }}
                                title={s.label}
                                style={{ backgroundColor: s.color }}
                                className={cn(
                                  "inline-flex h-6 items-center rounded-md px-2 text-xs font-extrabold transition-transform hover:scale-105",
                                  s.light ? "text-white" : "text-brand-night",
                                )}
                              >
                                SDG {s.n}
                                <span className="sr-only">: {s.label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
