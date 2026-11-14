"use client";

import { Camera, Eye, EyeOff, Pencil } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/admin/action-state";
import { memberGroupLabel } from "@/lib/admin/labels";
import { ConfirmAction } from "./confirm-action";
import { FormAlert } from "./form";

export type AdminMemberRow = {
  id: string;
  name: string;
  nameEn: string | null;
  role: string;
  className: string;
  group: "leadership" | "member";
  sortOrder: number;
  photoUrl: string | null;
  showPhoto: boolean;
  active: boolean;
  showPublicly: boolean;
  volunteerHours: number | null;
};

/**
 * Member list with checkboxes: an admin can show/hide many names on the public site at once
 * (e.g. after parental consent was collected for a class).
 */
export function MembersBulkList({
  rows,
  isAdmin,
  setPublic,
  deleteMember,
}: {
  rows: AdminMemberRow[];
  isAdmin: boolean;
  setPublic: (prev: ActionState, data: FormData) => Promise<ActionState>;
  deleteMember: (id: string) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(setPublic, {});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      {isAdmin && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="size-4 accent-[var(--brand-cyan)]"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
            />
            Бүгдийг сонгох
          </label>
          <span className="text-sm text-muted-foreground">({selected.size} сонгосон)</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="submit" name="show" value="1" size="sm" disabled={selected.size === 0}>
              <Eye /> Нэрийг нийтэд харуулах
            </Button>
            <Button
              type="submit"
              name="show"
              value="0"
              size="sm"
              variant="outline"
              disabled={selected.size === 0}
            >
              <EyeOff /> Нийтээс нуух
            </Button>
          </div>
        </div>
      )}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {rows.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-3 sm:p-4">
            {isAdmin && (
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-[var(--brand-cyan)]"
                aria-label={`Сонгох: ${m.name}`}
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
              />
            )}
            <span className="w-8 text-center font-mono text-xs text-muted-foreground">
              {m.sortOrder}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/members/${m.id}`}
                className="font-semibold hover:text-brand-cyan-strong"
              >
                {m.name}
              </Link>
              {m.nameEn && <span className="ml-2 text-xs text-muted-foreground">{m.nameEn}</span>}
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={m.group === "leadership" ? "default" : "secondary"}>
                  {memberGroupLabel[m.group]}
                </Badge>
                <span>{m.role}</span>
                {m.className && <span>· {m.className}</span>}
                {m.volunteerHours !== null && <span>· {m.volunteerHours} цаг</span>}
                <span
                  className={
                    m.showPublicly
                      ? "inline-flex items-center gap-1 font-semibold text-brand-green-strong"
                      : "inline-flex items-center gap-1"
                  }
                >
                  {m.showPublicly ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  {m.showPublicly ? "Нийтэд харагдана" : "Нийтэд харагдахгүй"}
                </span>
                {m.photoUrl && (
                  <span className="inline-flex items-center gap-1">
                    <Camera className="size-3" /> {m.showPhoto ? "Зураг нийтэд" : "Зураг нууц"}
                  </span>
                )}
                {!m.active && <span>· Идэвхгүй</span>}
              </p>
            </div>
            <Button asChild variant="ghost" size="icon-sm" aria-label={`Засах: ${m.name}`}>
              <Link href={`/admin/members/${m.id}`}>
                <Pencil />
              </Link>
            </Button>
            <ConfirmAction
              action={deleteMember.bind(null, m.id)}
              description={`${m.name}-г жагсаалтаас устгах уу?`}
            />
          </li>
        ))}
      </ul>
    </form>
  );
}
