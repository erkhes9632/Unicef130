"use client";

import {
  ArrowDown,
  ArrowUp,
  Camera,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionState } from "@/lib/admin/action-state";
import { memberGroupLabel } from "@/lib/admin/labels";
import { ConfirmAction } from "./confirm-action";

type AdminMemberRow = {
  id: string;
  name: string;
  nameEn: string | null;
  role: string;
  className: string;
  group: "leadership" | "member";
  photoUrl: string | null;
  showPhoto: boolean;
  active: boolean;
  showPublicly: boolean;
  /** Imported report hours and the year they belong to. */
  volunteerHours: number | null;
  hoursYear: string | null;
  team: string;
  /** Linked to a site account (approved applicant or linked by an admin). */
  userId: string | null;
  /** First / last leader on this page (no ↑ / ↓ past the ends). */
  first?: boolean;
  last?: boolean;
};

type SetPublic = (ids: string[], show: boolean, consent: boolean) => Promise<ActionState>;

/** Where a public name appears, with a link to check it (opens a new tab). */
function WhereShown({ group }: { group: AdminMemberRow["group"] }) {
  return (
    <a
      href="/members"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-semibold text-brand-green-strong underline-offset-4 hover:underline"
    >
      <Eye className="size-3" aria-hidden="true" />
      Нийтэд харагдана → {group === "leadership" ? "«Бидний тухай», /members" : "/members"} хуудсанд
      <ExternalLink className="size-3" aria-hidden="true" />
      <span className="sr-only">(шинэ цонхонд нээгдэнэ)</span>
    </a>
  );
}

/**
 * One school year's member list: names are hidden by default (most members are minors).
 * «Нийтэд харуулах» (for this year) asks once — for one person or the whole selection —
 * whether a parent or guardian agreed. The bin removes the person from this year only.
 */
export function MembersBulkList({
  rows,
  year,
  setPublic,
  remove,
  move,
}: {
  rows: AdminMemberRow[];
  year: string;
  setPublic: SetPublic;
  remove: (id: string) => Promise<ActionState>;
  move: (id: string, direction: "up" | "down") => Promise<ActionState>;
}) {
  const yearLabel = year.replace("-", "–");
  const editHref = (id: string) => `/admin/members/${id}?year=${year}`;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = (fn: () => Promise<ActionState>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (res.message) toast.success(res.message);
        after?.();
      } else toast.error(res.message ?? "Алдаа гарлаа");
    });
  const hide = (ids: string[]) =>
    run(
      () => setPublic(ids, false, false),
      () => setSelected(new Set()),
    );
  const show = (ids: string[]) => setConfirmIds(ids);

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-5 accent-[var(--brand-cyan)]"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
          />
          Бүгдийг сонгох
        </label>
        <span className="text-sm text-muted-foreground">({selected.size} сонгосон)</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={selected.size === 0 || pending}
            onClick={() => show([...selected])}
          >
            <Eye /> Нэрийг нийтэд харуулах
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selected.size === 0 || pending}
            onClick={() => hide([...selected])}
          >
            <EyeOff /> Нийтээс нуух
          </Button>
        </div>
      </div>

      <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {rows.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4">
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-[var(--brand-cyan)]"
              aria-label={`Сонгох: ${m.name}`}
              checked={selected.has(m.id)}
              onChange={() => toggle(m.id)}
            />
            <div className="min-w-0 flex-1">
              <Link href={editHref(m.id)} className="font-semibold hover:text-brand-cyan-strong">
                {m.name}
              </Link>
              {m.nameEn && <span className="ml-2 text-xs text-muted-foreground">{m.nameEn}</span>}
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={m.group === "leadership" ? "default" : "secondary"}>
                  {memberGroupLabel[m.group]}
                </Badge>
                <span>{m.role}</span>
                {m.className && <span>· {m.className}</span>}
                {m.team && <span>· {m.team} баг</span>}
                {m.userId && (
                  <span className="font-semibold text-brand-cyan-strong">· сайтад бүртгэлтэй</span>
                )}
                {m.volunteerHours !== null && (
                  <span>
                    · {m.volunteerHours} цаг
                    {m.hoursYear && m.hoursYear !== year && ` (${m.hoursYear.replace("-", "–")})`}
                  </span>
                )}
                {m.photoUrl && (
                  <span className="inline-flex items-center gap-1">
                    <Camera className="size-3" aria-hidden="true" />{" "}
                    {m.showPhoto ? "Зураг нийтэд" : "Зураг нууц"}
                  </span>
                )}
                {!m.active && <span>· Идэвхгүй</span>}
              </p>
              <p className="mt-1 text-xs">
                {m.showPublicly ? (
                  <WhereShown group={m.group} />
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <EyeOff className="size-3" aria-hidden="true" /> Нийтэд харагдахгүй
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {m.group === "leadership" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Дээшлүүлэх: ${m.name}`}
                    disabled={m.first || pending}
                    onClick={() => run(() => move(m.id, "up"))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Доошлуулах: ${m.name}`}
                    disabled={m.last || pending}
                    onClick={() => run(() => move(m.id, "down"))}
                  >
                    <ArrowDown />
                  </Button>
                </>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => (m.showPublicly ? hide([m.id]) : show([m.id]))}
              >
                {m.showPublicly ? <EyeOff /> : <Eye />}
                {m.showPublicly ? "Нуух" : "Нийтэд харуулах"}
              </Button>
              <Button asChild variant="ghost" size="icon-sm" aria-label={`Засах: ${m.name}`}>
                <Link href={editHref(m.id)}>
                  <Pencil />
                </Link>
              </Button>
              <ConfirmAction
                action={remove.bind(null, m.id)}
                title="Энэ жилээс хасах уу?"
                confirmLabel="Хасах"
                description={`${m.name}-г ${yearLabel} оны багаас хасах уу? Хүний мэдээлэл, бусад жилүүд, цаг нь хэвээр үлдэнэ.`}
              />
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={confirmIds !== null} onOpenChange={(o) => !o && setConfirmIds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нэрийг нийтлэх үү?</DialogTitle>
            <DialogDescription>
              {confirmIds && confirmIds.length > 1
                ? `Сонгосон ${confirmIds.length} сурагчийн нэрийг сайтад нийтлэхэд эцэг эх / асран хамгаалагч зөвшөөрсөн үү?`
                : "Энэ сурагчийн нэрийг сайтад нийтлэхэд эцэг эх / асран хамгаалагч зөвшөөрсөн үү?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Болих
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => setPublic(confirmIds ?? [], true, true),
                  () => {
                    setConfirmIds(null);
                    setSelected(new Set());
                  },
                )
              }
            >
              {pending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
              Тийм, зөвшөөрсөн
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
