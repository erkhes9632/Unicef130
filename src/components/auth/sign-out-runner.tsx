"use client";

import { useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

/** Ends the Clerk session once clerk-js is ready, then returns to the home page. */
export function SignOutRunner({ home, label }: { home: string; label: string }) {
  const clerk = useClerk();
  const loaded = clerk.loaded;
  useEffect(() => {
    if (!loaded) return;
    // Callback form: a full page load afterwards, so the server-rendered header is re-rendered
    // in the signed-out state (instead of Clerk's client-side redirect).
    void clerk.signOut(() => window.location.assign(home));
  }, [clerk, loaded, home]);
  return (
    <p role="status" className="inline-flex items-center gap-2 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </p>
  );
}
