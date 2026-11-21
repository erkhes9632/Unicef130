"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SELECTOR = ".reveal, .reveal-group, .grow-x, .draw-line";

/**
 * Drives the CSS reveal in globals.css (MOTION): every `.reveal` / `.reveal-group` / `.grow-x`
 * / `.draw-line` plays once per page view. Elements already on screen are marked shown before
 * anything is hidden (no flash, LCP untouched); the rest get `data-in` when they scroll in, and
 * `data-done` once the transition is over (so hover effects keep their own timing). Re-scans
 * after client navigations. Nothing happens under prefers-reduced-motion.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const done = (el: Element) => window.setTimeout(() => el.setAttribute("data-done", ""), 1400);
    const show = (el: Element) => {
      el.setAttribute("data-in", "");
      done(el);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = () => {
      for (const el of document.querySelectorAll(`:is(${SELECTOR}):not([data-in])`)) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.setAttribute("data-in", "");
          el.setAttribute("data-done", "");
        } else io.observe(el);
      }
    };
    scan();
    document.documentElement.setAttribute("data-reveal", "");
    // Content streamed in after the first scan (Suspense) is picked up too.
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => ((queued = 0), scan()));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(queued);
    };
  }, [pathname]);

  return null;
}
