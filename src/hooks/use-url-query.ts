"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "url-query-change";
const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENT, onChange);
  };
};

/**
 * Query string state for cached (static) pages: the server always renders the default view
 * (empty query), the browser applies `?…` after hydration. No Suspense boundary needed, unlike
 * `useSearchParams` on a static page.
 */
export function useUrlQuery() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const setQuery = useCallback((next: Record<string, string | undefined>, push = true) => {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history[push ? "pushState" : "replaceState"](null, "", url);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { query: new URLSearchParams(search), setQuery };
}
