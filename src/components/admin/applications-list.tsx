"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applicationStatuses } from "@/db/schema";
import type { ActionState } from "@/lib/admin/action-state";
import { applicationStatusLabels } from "@/lib/recruitment/logic";
import { NativeSelect } from "./form";

type Action = (prev: ActionState, data: FormData) => Promise<ActionState>;

/**
 * Results are shown as toasts: the list remounts when the counts change (e.g. after a bulk
 * status change), which would drop an inline message.
 */
const withToast =
  (action: Action): Action =>
  async (prev, data) => {
    const res = await action(prev, data);
    if (res.ok) toast.success(res.message ?? "OK");
    else if (res.message) toast.error(res.message);
    return res;
  };

/**
 * Applications with checkboxes and a bulk toolbar. Row contents are rendered on the server and
 * passed in; this component only owns the selection.
 */
export function ApplicationsList({
  items,
  bulkSetStatus,
}: {
  items: { id: string; label: string; content: React.ReactNode }[];
  bulkSetStatus: Action;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, statusAction, statusPending] = useActionState(withToast(bulkSetStatus), {});
  const visible = items.map((i) => i.id);
  const chosen = visible.filter((id) => selected.has(id));
  const all = chosen.length === visible.length && visible.length > 0;
  const ids = chosen.map((id) => <input key={id} type="hidden" name="ids" value={id} />);
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-4 accent-[var(--brand-cyan)]"
            checked={all}
            onChange={() => setSelected(all ? new Set() : new Set(visible))}
          />
          Энэ хуудсыг сонгох
        </label>
        <span className="text-sm text-muted-foreground">({chosen.length} сонгосон)</span>
        <form action={statusAction} className="ml-auto flex flex-wrap items-center gap-2">
          {ids}
          <NativeSelect
            name="status"
            aria-label="Шинэ төлөв"
            className="h-8 w-auto pointer-coarse:h-11"
            defaultValue=""
          >
            <option value="" disabled>
              Төлөв сонгох…
            </option>
            {applicationStatuses.map((s) => (
              <option key={s} value={s}>
                {applicationStatusLabels[s]}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" size="sm" disabled={chosen.length === 0 || statusPending}>
            Төлөв солих
          </Button>
        </form>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex gap-3 rounded-2xl bg-card p-3 ring-1 ring-border sm:p-4"
          >
            <input
              type="checkbox"
              className="mt-1.5 size-4 shrink-0 accent-[var(--brand-cyan)]"
              aria-label={`Сонгох: ${item.label}`}
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
            />
            <div className="min-w-0 flex-1">{item.content}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
