import { ChevronDown } from "lucide-react";

/**
 * «Нэмэлт тохиргоо»: rarely needed fields (search engines, category, tags), closed by default so
 * a form starts simple. Opens by itself when one of its fields has an error.
 */
export function MoreSettings({ open, children }: { open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-2xl bg-card ring-1 ring-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 font-bold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-6 [&::-webkit-details-marker]:hidden">
        Нэмэлт тохиргоо
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-6 px-0 pb-0 [&>section]:rounded-none [&>section]:border-t [&>section]:ring-0">
        {children}
      </div>
    </details>
  );
}
