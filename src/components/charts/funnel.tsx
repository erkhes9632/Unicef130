"use client";

/**
 * Funnel as horizontal bars: each step's width is relative to the first step, with the share
 * that reached it. Focusable rows carry the full sentence for screen readers.
 */
export function Funnel({
  steps,
  format,
  label,
}: {
  steps: { label: string; value: number; color?: string }[];
  format: (n: number) => string;
  label: string;
}) {
  const first = Math.max(1, steps[0]?.value ?? 0);
  return (
    <ol aria-label={label} className="space-y-2">
      {steps.map((s) => {
        const pct = ((s.value / first) * 100).toFixed(1);
        return (
          <li
            key={s.label}
            tabIndex={0}
            aria-label={`${s.label}: ${format(s.value)} (${pct}%)`}
            className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            title={`${pct}%`}
          >
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="font-semibold tabular-nums">
                {format(s.value)}{" "}
                <span className="font-normal text-muted-foreground">· {pct}%</span>
              </span>
            </div>
            <svg
              aria-hidden="true"
              width="100%"
              height="12"
              className="block overflow-hidden rounded-full"
            >
              <rect width="100%" height="12" className="fill-muted" />
              <rect
                width={`${Math.max(s.value ? 1.5 : 0, (s.value / first) * 100)}%`}
                height="12"
                fill={s.color ?? "var(--chart-2)"}
              />
            </svg>
          </li>
        );
      })}
    </ol>
  );
}
