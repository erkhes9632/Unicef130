"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import { FormAlert, SubmitButton } from "./form";

export type ImpactFormRow = {
  direction: "activity" | "education" | "charity" | "total";
  activities: number;
  inPerson: number;
  inPersonLabel: string;
  online: number;
  total: number;
  donationAmount: number;
  notes: string;
};

const directionLabel = {
  activity: "Нөлөөлөл",
  education: "Боловсрол",
  charity: "Хандив",
  total: "Нийт",
} as const;

const fields = [
  ["activities", "Үйл ажиллагаа"],
  ["inPerson", "Биечлэн (тоо)"],
  ["inPersonLabel", "Биечлэн (харуулах, жишээ: 300+)"],
  ["online", "Онлайн"],
  ["total", "Нийт хүрсэн"],
  ["donationAmount", "Хандив (₮)"],
] as const;

/** One school year: the three directions + the total row. Warnings show arithmetic mismatches. */
export function ImpactYearForm({
  action,
  rows,
  warnings,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  rows: ImpactFormRow[];
  warnings: string[];
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      {state.fieldErrors && (
        <ul className="list-disc rounded-xl bg-destructive/10 p-3 pl-8 text-sm text-destructive">
          {Object.entries(state.fieldErrors).flatMap(([k, v]) =>
            (v ?? []).map((m) => <li key={k + m}>{m}</li>),
          )}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-brand-gold-soft p-3 text-sm">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-gold-strong" />
              {w}
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => (
          <fieldset key={r.direction} className="space-y-3 rounded-xl border bg-background p-4">
            <legend className="px-1 font-bold">{directionLabel[r.direction]}</legend>
            <div className="grid grid-cols-2 gap-3">
              {fields.map(([key, label]) => (
                <label key={key} className="space-y-1 text-xs font-semibold">
                  <span>{label}</span>
                  <Input
                    name={`${r.direction}.${key}`}
                    defaultValue={String(r[key])}
                    inputMode={key === "inPersonLabel" ? "text" : "numeric"}
                  />
                </label>
              ))}
            </div>
            <label className="block space-y-1 text-xs font-semibold">
              <span>Тэмдэглэл (зөвхөн админд)</span>
              <Textarea name={`${r.direction}.notes`} defaultValue={r.notes} rows={2} />
            </label>
          </fieldset>
        ))}
      </div>
      <SubmitButton />
    </form>
  );
}
