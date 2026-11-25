"use client";

import { cn } from "@/lib/utils";

export type BarPart = { name: string; value: number; color: string };
export type BarItem = { label: string; value: number; parts?: BarPart[] };

/**
 * Horizontal bars (readable at 360 px: the label sits above its bar). With `parts` each bar is
 * split (e.g. Mongolian / English pages). Every row is focusable; the tooltip gives the exact
 * numbers and the share of the total.
 */
export function BarChart({
  items,
  format,
  label,
}: {
  items: BarItem[];
  format: (n: number) => string;
  label: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const legend = items[0]?.parts?.map((p) => ({ name: p.name, color: p.color })) ?? [];
  return (
    <div>
      <ul aria-label={label} className="space-y-2.5">
        {items.map((item) => {
          const share = ((item.value / total) * 100).toFixed(1);
          const detail = item.parts?.map((p) => `${p.name} ${format(p.value)}`).join(", ");
          return (
            <li
              key={item.label}
              tabIndex={0}
              aria-label={`${item.label}: ${format(item.value)} (${share}%)${detail ? `, ${detail}` : ""}`}
              className="group relative rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{item.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">{format(item.value)}</span>
              </div>
              <svg
                aria-hidden="true"
                width="100%"
                height="10"
                className="block overflow-hidden rounded-full"
              >
                <rect width="100%" height="10" className="fill-muted" />
                {
                  (
                    item.parts ?? [{ name: "", value: item.value, color: "var(--chart-1)" }]
                  ).reduce<{ x: number; el: React.ReactNode[] }>(
                    (acc, p) => {
                      const wPct = (p.value / max) * 100;
                      acc.el.push(
                        <rect
                          key={p.name}
                          x={`${acc.x}%`}
                          width={`${wPct}%`}
                          height="10"
                          fill={p.color}
                        />,
                      );
                      acc.x += wPct;
                      return acc;
                    },
                    { x: 0, el: [] },
                  ).el
                }
              </svg>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-7 right-0 z-10 hidden rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background group-hover:block group-focus-visible:block"
              >
                {share}%{detail ? ` · ${detail}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
      {legend.length > 1 && <Legend items={legend} className="mt-3" />}
    </div>
  );
}

/** One bar split into shares (devices, browsers…): no pie charts. */
export function StackedBar({
  parts,
  format,
  label,
}: {
  parts: BarPart[];
  format: (n: number) => string;
  label: string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const offsets = parts.map((_, i) =>
    parts.slice(0, i).reduce((sum, p) => sum + (p.value / total) * 100, 0),
  );
  return (
    <div>
      <svg
        role="img"
        aria-label={`${label}: ${parts.map((p) => `${p.name} ${((p.value / total) * 100).toFixed(1)}%`).join(", ")}`}
        width="100%"
        height="16"
        className="block overflow-hidden rounded-full"
      >
        {parts.map((p, i) => (
          <rect
            key={p.name}
            x={`${offsets[i]}%`}
            width={`${(p.value / total) * 100}%`}
            height="16"
            fill={p.color}
          />
        ))}
      </svg>
      <ul className="mt-2.5 grid gap-1.5 text-sm sm:grid-cols-2">
        {parts.map((p) => (
          <li
            key={p.name}
            tabIndex={0}
            title={`${format(p.value)}`}
            className="flex items-center justify-between gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="tabular-nums">{((p.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({
  items,
  className,
}: {
  items: { name: string; color: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-4 text-xs", className)}>
      {items.map((l) => (
        <li key={l.name} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: l.color }}
          />
          {l.name}
        </li>
      ))}
    </ul>
  );
}
