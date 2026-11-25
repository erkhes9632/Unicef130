import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PAGE_SIZE } from "@/lib/admin/list-limits";
import { cn } from "@/lib/utils";

type Params = Record<string, string | string[] | undefined>;

/** Previous / next links for an admin list; keeps every other filter in the address. */
export function Pager({
  path,
  params,
  page,
  total,
}: {
  path: string;
  params: Params;
  page: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (typeof v === "string" && v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${path}?${s}` : path;
  };
  const link =
    "inline-flex min-h-11 items-center gap-1 rounded-full px-4 font-semibold ring-1 ring-border hover:bg-muted";
  return (
    <nav aria-label="Хуудаслалт" className="mt-4 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={link} scroll={false}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Өмнөх
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        {page} / {pages} хуудас
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={cn(link)} scroll={false}>
          Дараах <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
