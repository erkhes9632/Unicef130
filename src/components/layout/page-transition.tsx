"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

/**
 * Soft fade between pages on client-side navigation (React <ViewTransition>, CSS in globals.css).
 * Keyed by pathname so only real page changes animate — not form submissions or filters that
 * change the query string. Browsers without the View Transitions API just swap the page.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}
