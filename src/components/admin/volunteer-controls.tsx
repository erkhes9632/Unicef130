"use client";

import { Check, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/admin/action-state";

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionState>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "OK");
      else toast.error(res.message ?? "Алдаа гарлаа.");
    });
  return { pending, run };
}

/** Attendance for one volunteer: hours + Ирсэн / Ирээгүй (or undo). */
export function AttendanceControls({
  status,
  hours,
  suggested,
  canLogHours,
  mark,
}: {
  status: string;
  hours: number | null;
  suggested: number | null;
  canLogHours: boolean;
  mark: (status: string, hours: string) => Promise<ActionState>;
}) {
  const { pending, run } = useRun();
  const [value, setValue] = useState(String(hours ?? suggested ?? ""));
  if (status === "cancelled") return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-xs">
        <span className="sr-only">Цаг</span>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          className="h-8 w-20"
          aria-label="Цаг"
          disabled={!canLogHours}
        />
        цаг
      </label>
      <Button
        size="sm"
        disabled={pending || !canLogHours}
        onClick={() => run(() => mark("attended", value))}
        title={canLogHours ? undefined : "Гишүүний мөртэй холбогдоогүй"}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Check />}
        {status === "attended" ? "Цаг шинэчлэх" : "Ирсэн"}
      </Button>
      {status !== "absent" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => mark("absent", ""))}
        >
          <X /> Ирээгүй
        </Button>
      )}
      {(status === "attended" || status === "absent") && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => mark("registered", ""))}
        >
          Буцаах
        </Button>
      )}
    </div>
  );
}

export function MarkAllAttended({
  suggested,
  action,
}: {
  suggested: number | null;
  action: (hours: string) => Promise<ActionState>;
}) {
  const { pending, run } = useRun();
  const [value, setValue] = useState(String(suggested ?? ""));
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-card p-4 ring-1 ring-border">
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Цаг (хүн бүрт)
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          className="h-9 w-24"
        />
      </label>
      <Button disabled={pending} onClick={() => run(() => action(value))}>
        {pending && <Loader2 className="animate-spin" />} Бүртгүүлсэн бүгдийг «Ирсэн» болгох
      </Button>
    </div>
  );
}
