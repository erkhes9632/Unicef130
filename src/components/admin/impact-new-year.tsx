"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/admin/action-state";
import { FormAlert } from "./form";

export function ImpactNewYear({
  action,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      <FormAlert state={state} />
      {state.fieldErrors?.[""]?.map((m) => (
        <p key={m} className="text-sm text-destructive">
          {m}
        </p>
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-sm font-semibold">
          <span>Шинэ хичээлийн жил</span>
          <Input name="schoolYear" placeholder="2026-2027" className="w-40" required />
        </label>
        <Button type="submit" variant="outline">
          <Plus /> Нэмэх
        </Button>
      </div>
    </form>
  );
}
