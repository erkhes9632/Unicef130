"use client";

import { useHeaderSession } from "@/components/auth/use-header-session";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * "Гишүүн болох" for visitors and applicants only: members and admins are already in. The page
 * is cached, so the role comes from the display hint (role-hint.ts), after hydration.
 */
export function JoinCtaButton({ label, className }: { label: string; className?: string }) {
  const { role } = useHeaderSession();
  if (role === "member" || role === "admin") return null;
  return (
    <Button asChild className={className}>
      <Link href="/join">{label}</Link>
    </Button>
  );
}
