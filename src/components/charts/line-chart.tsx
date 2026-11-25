"use client";

import { useId, useState } from "react";
import { useWidth } from "./use-width";

export type LineSeries = { name: string; color: string; values: number[] };

/** Round up to a readable axis maximum (1, 2, 5 × 10^n). */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

/**
 * Line chart with up to a few series (the first one is also shaded). Keyboard: focus the chart
 * and use ← → (Home / End) to move between points; the tooltip reads out every series. No
 * animation, so nothing moves for people who prefer reduced motion.
 */
export function LineChart({
  labels,
  longLabels = labels,
  series,
  format,
  height = 220,
  label,
}: {
  /** Short x-axis labels (one per point). */
  labels: string[];
  /** Full labels for the tooltip. */
  longLabels?: string[];
  series: LineSeries[];
  format: (n: number) => string;
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const n = labels.length;
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const x = (i: number) => pad.l + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => pad.t + h - (v / max) * h;
  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 70))));

  const move = (e: React.KeyboardEvent) => {
    const cur = active ?? n - 1;
    const next =
      e.key === "ArrowLeft"
        ? cur - 1
        : e.key === "ArrowRight"
          ? cur + 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(Math.min(n - 1, Math.max(0, next)));
  };
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - pad.l) / w) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  };
  const tip =
    active !== null
      ? `${longLabels[active]}: ${series.map((s) => `${s.name} ${format(s.values[active] ?? 0)}`).join(", ")}`
      : "";

  return (
    <div ref={ref} className="relative w-full min-w-0 overflow-hidden">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        aria-describedby={`${id}-tip`}
        tabIndex={0}
        className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        onKeyDown={move}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        onPointerMove={pick}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={pad.l + w}
              y1={y(t)}
              y2={y(t)}
              className="stroke-border"
              strokeDasharray={t ? "3 4" : undefined}
            />
            <text
              x={pad.l - 6}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {format(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 || i === n - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {l}
            </text>
          ) : null,
        )}
        {series[0] && n > 1 && (
          <path
            d={`M${x(0)},${y(0)} ${series[0].values.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(n - 1)},${y(0)} Z`}
            fill={series[0].color}
            opacity={0.12}
          />
        )}
        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        ))}
        {active !== null && (
          <g aria-hidden="true">
            <line
              x1={x(active)}
              x2={x(active)}
              y1={pad.t}
              y2={pad.t + h}
              className="stroke-foreground/30"
            />
            {series.map((s) => (
              <circle
                key={s.name}
                cx={x(active)}
                cy={y(s.values[active] ?? 0)}
                r={4.5}
                fill={s.color}
                className="stroke-card"
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>
      <p
        id={`${id}-tip`}
        aria-live="polite"
        className={
          active === null
            ? "sr-only"
            : "pointer-events-none absolute top-1 max-w-[80%] -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background shadow-soft"
        }
        style={
          active === null ? undefined : { left: Math.min(width - 80, Math.max(80, x(active))) }
        }
      >
        {tip}
      </p>
      <ul className="mt-2 flex flex-wrap gap-4 text-xs">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-1 w-4 rounded-full"
              style={{ background: s.color }}
            />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
