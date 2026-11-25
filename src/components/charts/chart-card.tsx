"use client";

import { Table2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChartTable = { columns: string[]; rows: (string | number)[][] };

/**
 * Frame for every chart: title, unit, a one-line "what this means", a table view of the same
 * numbers ("Хүснэгтээр харах"), a skeleton while loading and an empty state.
 */
export function ChartCard({
  title,
  caption,
  unit,
  loading,
  empty,
  emptyText = "Энэ хугацаанд мэдээлэл алга.",
  table,
  className,
  children,
}: {
  title: string;
  caption: string;
  unit?: string;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  table?: ChartTable;
  className?: string;
  children?: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-t`}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-3xl bg-card p-5 ring-1 ring-border sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`${id}-t`} className="font-heading text-lg font-extrabold">
            {title}
            {unit && (
              <span className="ml-1.5 text-sm font-semibold text-muted-foreground">({unit})</span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">{caption}</p>
        </div>
        {table && !loading && !empty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={asTable}
            onClick={() => setAsTable((v) => !v)}
          >
            <Table2 aria-hidden="true" /> {asTable ? "Графикаар харах" : "Хүснэгтээр харах"}
          </Button>
        )}
      </div>
      {loading ? (
        <div aria-hidden="true" className="h-48 rounded-2xl bg-muted motion-safe:animate-pulse" />
      ) : empty ? (
        <p className="rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : asTable && table ? (
        <div className="max-h-80 overflow-auto rounded-xl ring-1 ring-border">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-muted">
              <tr>
                {table.columns.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 text-left font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="odd:bg-muted/30">
                  {r.map((cell, j) => (
                    <td key={j} className={cn("px-3 py-1.5", j > 0 && "tabular-nums")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
