"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import { applicationStatusLabel } from "@/lib/admin/labels";
import { FormAlert, NativeSelect, SubmitButton } from "./form";

export function ApplicationStatusSelect({
  value,
  action,
}: {
  value: string;
  action: (status: string) => Promise<ActionState>;
}) {
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <NativeSelect
        aria-label="Төлөв"
        className="h-8 w-auto"
        defaultValue={value}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const res = await action(e.target.value);
            if (res.ok) toast.success(res.message ?? "OK");
            else toast.error(res.message ?? "Алдаа");
          })
        }
      >
        {Object.entries(applicationStatusLabel).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </NativeSelect>
      {pending && <Loader2 className="size-4 animate-spin" />}
    </span>
  );
}

export function ApplicationNotesForm({
  notes,
  action,
}: {
  notes: string;
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      <Textarea
        name="notes"
        defaultValue={notes}
        rows={2}
        maxLength={2000}
        placeholder="Дотоод тэмдэглэл (зөвхөн админд харагдана)"
        aria-label="Тэмдэглэл"
      />
      <div className="flex items-center gap-2">
        <SubmitButton className="h-8 px-3 text-xs">Тэмдэглэл хадгалах</SubmitButton>
        <FormAlert state={state} />
      </div>
    </form>
  );
}

export function RetrySyncButton({ action }: { action: () => Promise<ActionState> }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await action();
          if (res.ok) toast.success(res.message ?? "OK");
          else toast.error(res.message ?? "Алдаа");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Дахин sync хийх
    </Button>
  );
}
