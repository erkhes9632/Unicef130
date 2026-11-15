"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Link into /me or /admin right after a role change. The session token (with the `role` claim
 * the middleware reads) is refreshed first, so a newly approved member isn't bounced back.
 */
export function MemberAreaLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await getToken({ skipCache: true });
        } finally {
          window.location.assign(href);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
      {children}
    </Button>
  );
}
