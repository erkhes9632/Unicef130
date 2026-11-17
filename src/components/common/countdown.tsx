"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type CountdownLabels = { days: string; hours: string; minutes: string; seconds: string };

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Live countdown to an instant. `compact` renders one line of text (for the banner); the default
 * renders four tiles. When it reaches zero (having started above it) the page data is refreshed
 * once, so /join switches to the form when a period opens and back to "closed" when it ends.
 */
export function Countdown({
  to,
  labels,
  compact = false,
}: {
  to: string;
  labels: CountdownLabels;
  compact?: boolean;
}) {
  const router = useRouter();
  const target = Date.parse(to);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = target - now;
  const done = left <= 0;
  // Only a countdown that was running refreshes: a page rendered after the instant must not loop.
  const wasRunning = useRef(!done);
  useEffect(() => {
    if (!done || !wasRunning.current) return;
    wasRunning.current = false;
    // A short delay absorbs small clock differences between the device and the server.
    const id = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(id);
  }, [done, router]);

  const p = parts(left);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (compact) {
    return (
      <span suppressHydrationWarning className="font-semibold tabular-nums">
        {p.days > 0 && `${p.days} ${labels.days} `}
        {pad(p.hours)}:{pad(p.minutes)}:{pad(p.seconds)}
      </span>
    );
  }
  const tiles = [
    [p.days, labels.days],
    [p.hours, labels.hours],
    [p.minutes, labels.minutes],
    [p.seconds, labels.seconds],
  ] as const;
  return (
    <div role="timer" aria-live="off" className="grid grid-cols-4 gap-2 sm:gap-3">
      {tiles.map(([value, label]) => (
        <div key={label} className="rounded-2xl bg-card p-3 text-center ring-1 ring-border">
          <div
            suppressHydrationWarning
            className="font-heading text-2xl font-extrabold tabular-nums sm:text-4xl"
          >
            {pad(value)}
          </div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}
