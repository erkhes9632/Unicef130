"use client";

import { Ban, Loader2, RefreshCw } from "lucide-react";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/admin/action-state";
import { applicationStatusLabel } from "@/lib/admin/labels";
import { FormAlert, keepValuesOnSubmit, NativeSelect, SubmitButton } from "./form";

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
    <form action={formAction} onSubmit={keepValuesOnSubmit(formAction)} className="space-y-2">
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

export function ReviewerSelect({
  value,
  reviewers,
  action,
}: {
  value: string | null;
  reviewers: { id: string; name: string }[];
  action: (reviewerId: string) => Promise<ActionState>;
}) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      aria-label="Хянагч"
      className="h-8 w-auto"
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          const res = await action(e.target.value);
          if (res.ok) toast.success(res.message ?? "OK");
          else toast.error(res.message ?? "Алдаа");
        })
      }
    >
      <option value="">Хянагч оноогоогүй</option>
      {reviewers.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </NativeSelect>
  );
}

/** Admin only: block the sender's phone or network address for 30 days. */
export function BlockButtons({
  hasPhone,
  hasIp,
  action,
}: {
  hasPhone: boolean;
  hasIp: boolean;
  action: (kind: "phone" | "ip", days: number) => Promise<ActionState>;
}) {
  const [pending, start] = useTransition();
  const run = (kind: "phone" | "ip") =>
    start(async () => {
      const answer = window.prompt("Хэдэн хоног блоклох вэ? (1–365)", "30");
      if (answer === null) return;
      const res = await action(kind, Number.parseInt(answer, 10));
      if (res.ok) toast.success(res.message ?? "OK");
      else toast.error(res.message ?? "Алдаа");
    });
  return (
    <span className="inline-flex flex-wrap gap-2">
      {hasPhone && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("phone")}>
          <Ban /> Утсыг блоклох
        </Button>
      )}
      {hasIp && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("ip")}>
          <Ban /> Сүлжээг блоклох
        </Button>
      )}
    </span>
  );
}

export function UnblockButton({ action }: { action: () => Promise<ActionState> }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await action();
          if (res.ok) toast.success(res.message ?? "OK");
          else toast.error(res.message ?? "Алдаа");
        })
      }
    >
      Блок авах
    </Button>
  );
}
