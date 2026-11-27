"use client";

import { pickYear, YearChips, YearGroups, type YearLabels } from "@/components/common/year-groups";
import { useUrlQuery } from "@/hooks/use-url-query";

/**
 * Albums of the cached gallery page: cards are rendered on the server once (newest first);
 * the browser applies the school-year chips (?year=) and shows one heading per year.
 */
export function GalleryBrowser({
  albums,
  cards,
  labels,
}: {
  albums: { id: string; year: string }[];
  cards: Record<string, React.ReactNode>;
  labels: YearLabels;
}) {
  const { query, setQuery } = useUrlQuery();
  const years = [...new Set(albums.map((a) => a.year))];
  const year = pickYear(query.get("year"), years);
  const shown = year ? albums.filter((a) => a.year === year) : albums;
  return (
    <>
      <YearChips
        years={years}
        active={year}
        labels={labels}
        href={(y) => (y ? `?year=${y}` : "?")}
        onPick={(y) => (e) => {
          e.preventDefault();
          setQuery({ year: y || undefined });
        }}
      />
      <YearGroups
        items={shown}
        labels={labels}
        render={(list) => (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <div key={a.id} className="contents">
                {cards[a.id]}
              </div>
            ))}
          </div>
        )}
      />
    </>
  );
}
