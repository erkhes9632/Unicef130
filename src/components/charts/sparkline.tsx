/** Tiny trend line for KPI tiles (decorative: the tile states the number in text). */
export function Sparkline({
  values,
  className,
  color = "var(--chart-1)",
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * 100).toFixed(2)},${(30 - (v / max) * 28).toFixed(2)}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" className={className}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
