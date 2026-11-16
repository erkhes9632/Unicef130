"use client";

import { useEffect, useRef, useState } from "react";
import { easeOutCubic, formatStat, parseStat } from "@/lib/motion/count-up";

const DURATION_MS = 1400;

/**
 * A stat that counts up the first time it scrolls into view. The server renders the final value,
 * so there is no flash: numbers already visible when the page loads stay as they are, and
 * screen readers always get the real value. Off under prefers-reduced-motion.
 */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    const parsed = parseStat(value);
    if (!el || !parsed || parsed.target === 0 || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let first = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (first) {
          first = false;
          if (entry.intersectionRatio > 0) return io.disconnect(); // already on screen: keep it
          setDisplay(formatStat(parsed, 0)); // off screen: reset quietly, count up later
          return;
        }
        if (entry.intersectionRatio < 0.5) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = (now - start) / DURATION_MS;
          setDisplay(formatStat(parsed, parsed.target * easeOutCubic(t)));
          if (t < 1) raf = requestAnimationFrame(tick);
          else setDisplay(value);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: [0, 0.5] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  // The invisible copy reserves the final width, so counting never shifts the layout.
  return (
    <span ref={ref} className="inline-grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {value}
      </span>
      <span aria-hidden="true" className="col-start-1 row-start-1 tabular-nums">
        {display}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
