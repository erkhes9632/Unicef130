"use client";

import { ArrowRight } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type ExplorerGoal = {
  n: number;
  name: string;
  color: string;
  light: boolean;
  /** Pre-formatted "3 activities" (empty when the goal has none). */
  countLabel: string;
  activities: { id: string; title: string; href: string }[];
};

/**
 * All 17 Sustainable Development Goals as a grid: the goals the club's activities served this
 * year in their official colours (selectable), the rest greyed out. The panel lists the
 * activities of the selected goal and links to the related news.
 */
export function SdgExplorer({
  goals,
  initial,
  labels,
}: {
  goals: ExplorerGoal[];
  initial: number;
  labels: { pick: string; none: string; news: string; activities: string };
}) {
  const [selected, setSelected] = useState(initial);
  const panelId = useId();
  const goal = goals.find((g) => g.n === selected) ?? goals.find((g) => g.activities.length);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <ul aria-label={labels.pick} className="grid grid-cols-6 gap-2 sm:gap-3 lg:grid-cols-6">
        {goals.map((g) => {
          const active = g.activities.length > 0;
          const isSelected = active && g.n === goal?.n;
          return (
            <li key={g.n}>
              {active ? (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-controls={panelId}
                  onClick={() => setSelected(g.n)}
                  style={{ backgroundColor: g.color }}
                  className={cn(
                    "relative flex aspect-square w-full flex-col items-center justify-center rounded-xl font-heading font-extrabold shadow-sm transition-[scale,box-shadow] duration-200 hover:scale-105 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none sm:rounded-2xl",
                    g.light ? "text-white" : "text-brand-night",
                    isSelected &&
                      "scale-105 shadow-lg ring-3 ring-foreground ring-offset-2 ring-offset-background",
                  )}
                >
                  <span className="text-[0.55rem] leading-none sm:text-xs">SDG</span>
                  <span className="text-lg leading-none sm:text-3xl">{g.n}</span>
                  <span className="sr-only">
                    : {g.name} — {g.countLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-background text-[0.65rem] text-foreground shadow ring-1 ring-border sm:size-6 sm:text-xs"
                  >
                    {g.activities.length}
                  </span>
                </button>
              ) : (
                <span
                  className="flex aspect-square w-full flex-col items-center justify-center rounded-xl bg-muted font-heading font-extrabold text-muted-foreground sm:rounded-2xl"
                  title={g.name}
                >
                  <span aria-hidden="true" className="text-[0.55rem] leading-none sm:text-xs">
                    SDG
                  </span>
                  <span aria-hidden="true" className="text-lg leading-none sm:text-3xl">
                    {g.n}
                  </span>
                  <span className="sr-only">
                    SDG {g.n}: {g.name} — {labels.none}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {goal && (
        <div
          id={panelId}
          aria-live="polite"
          className="overflow-hidden rounded-3xl bg-card ring-1 ring-border lg:sticky lg:top-24"
        >
          <div
            style={{ backgroundColor: goal.color }}
            className={cn("p-5 sm:p-6", goal.light ? "text-white" : "text-brand-night")}
          >
            <p className="font-heading text-4xl font-extrabold">SDG {goal.n}</p>
            <p className="mt-1 text-lg font-bold">{goal.name}</p>
            <p className="mt-1 text-sm font-semibold">{goal.countLabel}</p>
          </div>
          <div className="p-5 sm:p-6">
            <h3 className="sr-only">{labels.activities}</h3>
            <ul className="space-y-2">
              {goal.activities.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    className="group -m-2 flex items-start gap-3 rounded-xl p-2 font-semibold hover:bg-muted"
                  >
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: goal.color }}
                      className="mt-2 size-2 shrink-0 rounded-full"
                    />
                    <span className="group-hover:underline">{a.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={{ pathname: "/news", query: { sdg: String(goal.n) } }}
              className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-brand-cyan-strong hover:underline"
            >
              {labels.news} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
