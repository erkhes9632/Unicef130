import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Simple numbered pagination using ?page= links (works without JS). */
export async function PaginationNav({
  page,
  pageCount,
  pathname,
  query = {},
}: {
  page: number;
  pageCount: number;
  pathname: string;
  query?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const t = await getTranslations("Pagination");
  const href = (p: number) => {
    const q = Object.fromEntries(
      Object.entries({ ...query, page: p > 1 ? String(p) : undefined }).filter(([, v]) => v),
    ) as Record<string, string>;
    return { pathname, query: q };
  };

  return (
    <nav aria-label={t("label")} className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Button asChild variant="outline" size="icon" aria-label={t("previous")}>
          <Link href={href(page - 1)}>
            <ChevronLeft />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label={t("previous")}>
          <ChevronLeft />
        </Button>
      )}
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <Button
          key={p}
          asChild
          variant={p === page ? "default" : "ghost"}
          size="icon"
          className={cn(p === page && "pointer-events-none")}
        >
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={t("page", { page: p })}
          >
            {p}
          </Link>
        </Button>
      ))}
      {page < pageCount ? (
        <Button asChild variant="outline" size="icon" aria-label={t("next")}>
          <Link href={href(page + 1)}>
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon" disabled aria-label={t("next")}>
          <ChevronRight />
        </Button>
      )}
    </nav>
  );
}
