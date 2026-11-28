import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * "Гишүүн болох" for visitors and applicants only: members and admins are already in. The page
 * is cached (the same HTML for everyone), so the button is always rendered and hidden for
 * members by CSS before the first paint (`hide-for-members`, see MEMBER_HINT_SCRIPT in
 * lib/auth/role-hint.ts) — no layout shift.
 */
export function JoinCtaButton({ label, className }: { label: string; className?: string }) {
  return (
    <Button asChild className={cn("hide-for-members", className)}>
      <Link href="/join">{label}</Link>
    </Button>
  );
}
