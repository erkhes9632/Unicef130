"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SELECTOR = ".reveal, .reveal-group, .grow-x, .draw-line";

/**
 * Drives the reveal in globals.css (MOTION): every `.reveal` / `.reveal-group` / `.grow-x` /
 * `.draw-line` plays once, when it starts entering the screen (`data-play`). Nothing is hidden
 * before that, so content off screen is always there (screenshots, print, fast jumps), and
 * elements already on screen when the page loads are left alone (no flash, LCP untouched).
 * Re-scans after client navigations and streamed content. Nothing happens under
 * prefers-reduced-motion.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-play", "");
        io.unobserve(entry.target);
      }
    });
    const scan = () => {
      for (const el of document.querySelectorAll(SELECTOR)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        // On screen already (or above it): stays as it is.
        if (r.top < window.innerHeight) continue;
        io.observe(el);
      }
    };
    scan();
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
