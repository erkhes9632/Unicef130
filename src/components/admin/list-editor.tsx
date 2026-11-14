"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Small repeatable-list editor: add, remove and reorder rows. The parent keeps the list in
 * state and serializes it into a hidden input for the Server Action.
 */
export function ListEditor<T>({
  items,
  onChange,
  create,
  renderItem,
  itemLabel,
  addLabel,
  max,
  emptyText,
  getKey,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  itemLabel: (item: T, index: number) => string;
  addLabel: string;
  max: number;
  emptyText?: string;
  /** Stable key per row (needed when rows hold their own state, e.g. image pickers). */
  getKey: (item: T) => string;
}) {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it!);
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.length === 0 && emptyText && (
        <p className="rounded-xl border-2 border-dashed p-4 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      )}
      <ol className="space-y-3">
        {items.map((item, i) => {
          const label = itemLabel(item, i);
          return (
            <li key={getKey(item)} className="space-y-3 rounded-xl border bg-background p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">
                  {i + 1}. {label}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                    aria-label={`Дээш зөөх: ${label}`}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, i + 1)}
                    aria-label={`Доош зөөх: ${label}`}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onChange(items.filter((_, j) => j !== i))}
                    aria-label={`Устгах: ${label}`}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
              {renderItem(
                item,
                (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))),
                i,
              )}
            </li>
          );
        })}
      </ol>
      {items.length < max && (
        <Button type="button" variant="outline" onClick={() => onChange([...items, create()])}>
          <Plus /> {addLabel}
        </Button>
      )}
    </div>
  );
}
