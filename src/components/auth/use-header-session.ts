"use client";

import { useEffect, useSyncExternalStore } from "react";
import { readHeaderSession } from "@/lib/auth/role-hint";

const EVENT = "club-role-hint";
const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
};
const signedOut = JSON.stringify({ signedIn: false, role: null });
let refreshing = false;

/**
 * Sign-in state for the public header, read from cookies after hydration (the cached HTML is
 * always rendered signed out). A signed-in visitor without a role hint asks the server once.
 */
export function useHeaderSession() {
  const raw = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(readHeaderSession(document.cookie)),
    () => signedOut,
  );
  const session = JSON.parse(raw) as ReturnType<typeof readHeaderSession>;
  useEffect(() => {
    if (!session.signedIn || session.role || refreshing) return;
    if (sessionStorage.getItem(EVENT)) return;
    refreshing = true;
    sessionStorage.setItem(EVENT, "1");
    void fetch("/auth/role-hint", { credentials: "same-origin" })
      .then(() => window.dispatchEvent(new Event(EVENT)))
      .catch(() => {})
      .finally(() => (refreshing = false));
  }, [session.signedIn, session.role]);
  return session;
}
