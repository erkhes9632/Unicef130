import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * An admin list with nothing in it yet: what it is and what to do next (one button). The
 * "nothing matches these filters" case is the FilterBar's own message.
 */
export function AdminEmpty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center">
      <p className="font-semibold">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {action && (
        <Button asChild className="mt-2">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
