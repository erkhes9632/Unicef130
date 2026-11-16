"use client";

import { Loader2, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/admin/action-state";
import { FormAlert, NativeSelect } from "./form";

export type HoursMemberRow = {
  id: string;
  name: string;
  className: string;
  team: string;
  imported: number;
  logged: number;
  total: number;
  active: boolean;
};

/**
 * Yearly totals per member with checkboxes, plus the form that adds the same hours to every
 * selected member (one entry each).
 */
export function HoursBoard({
  rows,
  year,
  events,
  today,
  threshold,
  addHours,
}: {
  rows: HoursMemberRow[];
  year: string;
  events: { id: string; title: string }[];
  today: string;
  threshold: number | null;
  addHours: (prev: ActionState, data: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(addHours, {});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const all = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="schoolYear" value={year} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="memberIds" value={id} />
      ))}
      <div className="sticky top-14 z-10 grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:grid-cols-2 lg:grid-cols-[auto_6rem_10rem_1fr_1fr_auto] lg:items-end">
        <p className="text-sm font-semibold lg:self-center">{selected.size} гишүүн сонгосон</p>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Цаг
          <Input name="hours" inputMode="decimal" required placeholder="2" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Огноо
          <Input name="date" type="date" required defaultValue={today} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Арга хэмжээ (заавал биш)
          <NativeSelect name="eventId" defaultValue="">
            <option value="">—</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Тэмдэглэл
          <Input name="note" maxLength={200} placeholder="Жишээ: хандивын аян" />
        </label>
        <Button type="submit" disabled={pending || selected.size === 0}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Цаг нэмэх
        </Button>
        <div className="sm:col-span-2 lg:col-span-6">
          <FormAlert state={state} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-border">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  aria-label="Бүгдийг сонгох"
                  className="size-4 accent-[var(--brand-cyan)]"
                  checked={all}
                  onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))}
                />
              </th>
              <th className="p-3">Гишүүн</th>
              <th className="p-3">Баг</th>
              <th className="p-3 text-right">Тайлангаас</th>
              <th className="p-3 text-right">Бүртгэсэн</th>
              <th className="p-3 text-right">Нийт</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  <input
                    type="checkbox"
                    aria-label={`Сонгох: ${r.name}`}
                    className="size-4 accent-[var(--brand-cyan)]"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </td>
                <td className="p-3">
                  <span className="font-semibold">{r.name}</span>
                  {r.className && <span className="text-muted-foreground"> · {r.className}</span>}
                </td>
                <td className="p-3 text-muted-foreground">{r.team || "—"}</td>
                <td className="p-3 text-right">{r.imported || "—"}</td>
                <td className="p-3 text-right">{r.logged || "—"}</td>
                <td className="p-3 text-right font-semibold">
                  {r.total}
                  {r.active && (
                    <Badge className="ml-2" title={`≥ ${threshold} цаг`}>
                      идэвхтэй
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
