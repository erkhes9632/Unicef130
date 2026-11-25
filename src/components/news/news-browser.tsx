"use client";

import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { useUrlQuery } from "@/hooks/use-url-query";
import { cn } from "@/lib/utils";

export type NewsMeta = { id: string; category: string; sdgs: number[] };

type Labels = {
  filter: string;
  all: string;
  categories: Record<string, string>;
  clearFilter: string;
  empty: string;
  backToList: string;
  pagination: { label: string; previous: string; next: string; page: string };
};

const chip = (active: boolean) =>
  cn(
    "inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-semibold whitespace-nowrap ring-1 ring-border transition-colors hover:bg-muted",
    active && "bg-brand-cyan text-brand-ink ring-brand-cyan hover:bg-brand-cyan",
  );

/**
 * News list of a cached page: every card is rendered on the server once; the category / SDG /
 * page filters (?category=, ?sdg=, ?page=) are applied here. Without JavaScript the first page
 * of all posts is shown and the chips are ordinary links.
 */
export function NewsBrowser({
  items,
  cards,
  sdgBadges,
  categories,
  labels,
  pageSize,
}: {
  items: NewsMeta[];
  cards: Record<string, React.ReactNode>;
  /** One rendered SDG badge per goal used by a post (shown above a filtered list). */
  sdgBadges: Record<number, React.ReactNode>;
  categories: readonly string[];
  labels: Labels;
  pageSize: number;
}) {
  const { query, setQuery } = useUrlQuery();
  const category = categories.includes(query.get("category") ?? "") ? query.get("category")! : "";
  const sdg = Number(query.get("sdg")) || 0;
  const filtered = items.filter(
    (i) => (!category || i.category === category) && (!sdg || i.sdgs.includes(sdg)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, Number(query.get("page")) || 1), pageCount);
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);

  const go = (next: Record<string, string | undefined>) => (e: React.MouseEvent) => {
    e.preventDefault();
    setQuery(next);
    document.getElementById("news-list")?.scrollIntoView({ block: "start" });
  };
  const href = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(
      Object.entries(next).filter((e): e is [string, string] => !!e[1]),
    );
    return p.size ? `?${p}` : "?";
  };

  return (
    <div id="news-list" className="scroll-mt-28">
      <nav
        aria-label={labels.filter}
        // Scrolls sideways on phones; the edges fade so it reads as "more this way".
        className="-mx-4 mb-8 [scrollbar-width:none] overflow-x-auto [mask-image:linear-gradient(90deg,transparent,black_1rem,black_calc(100%-1.5rem),transparent)] px-4 py-1 sm:mx-0 sm:[mask-image:none] sm:px-0"
      >
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {["", ...categories].map((c) => (
            <li key={c || "all"}>
              <a
                href={href({ category: c || undefined })}
                onClick={go({ category: c || undefined, page: undefined, sdg: undefined })}
                className={chip(category === c)}
                aria-current={category === c ? "page" : undefined}
              >
                {c ? labels.categories[c] : labels.all}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {sdg > 0 && sdgBadges[sdg] && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {sdgBadges[sdg]}
          <a
            href="?"
            onClick={go({ sdg: undefined, page: undefined })}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-cyan-strong hover:underline"
          >
            {labels.clearFilter}
          </a>
        </div>
      )}

      {shown.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => (
            <div key={i.id} className="contents">
              {cards[i.id]}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Newspaper} title={labels.empty}>
          <a
            href="?"
            onClick={go({ category: undefined, sdg: undefined, page: undefined })}
            className="inline-flex min-h-11 items-center font-semibold text-brand-cyan-strong hover:underline"
          >
            {labels.backToList}
          </a>
        </EmptyState>
      )}

      {pageCount > 1 && (
        <nav
          aria-label={labels.pagination.label}
          className="mt-10 flex items-center justify-center gap-1.5"
        >
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            aria-label={labels.pagination.previous}
            onClick={go({ page: page > 2 ? String(page - 1) : undefined })}
          >
            <ChevronLeft />
          </Button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              asChild
              variant={p === page ? "default" : "ghost"}
              size="icon"
              className={cn(p === page && "pointer-events-none")}
            >
              <a
                href={href({
                  category: category || undefined,
                  sdg: sdg ? String(sdg) : undefined,
                  page: p > 1 ? String(p) : undefined,
                })}
                onClick={go({ page: p > 1 ? String(p) : undefined })}
                aria-current={p === page ? "page" : undefined}
                aria-label={labels.pagination.page.replace("{page}", String(p))}
              >
                {p}
              </a>
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            disabled={page >= pageCount}
            aria-label={labels.pagination.next}
            onClick={go({ page: String(page + 1) })}
          >
            <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}
