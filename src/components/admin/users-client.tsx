"use client";

import {
  Ban,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserRound,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/admin/action-state";
import type { AppRole } from "@/lib/auth/roles";

type Run = () => Promise<ActionState>;

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: Run, confirmText?: string) =>
    start(async () => {
      if (confirmText && !window.confirm(confirmText)) return;
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "OK");
      else toast.error(res.message ?? "Алдаа гарлаа.");
    });
  return { pending, run };
}

/** Strong confirmation: the admin retypes the account's e-mail before a permanent delete. */
function DeleteAccountDialog({
  email,
  action,
}: {
  email: string;
  action: (confirmEmail: string) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const matches = typed.trim().toLowerCase() === email.toLowerCase() && email !== "";
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTyped("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive">
          <Trash2 /> Бүр мөсөн устгах
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Бүртгэлийг бүр мөсөн устгах уу?</DialogTitle>
          <DialogDescription>
            Clerk бүртгэл устаж, нэвтрэх боломжгүй болно. Өргөдөл болон хувийн мэдээлэл устгагдана;
            гишүүний бүртгэл нэргүй болж, сайн дурын цаг нь нийт дүнд үлдэнэ. Буцаах боломжгүй.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold">
            Баталгаажуулахын тулд <span className="font-mono">{email}</span> гэж бичнэ үү
          </span>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            aria-label="Баталгаажуулах и-мэйл"
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Болих
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={() =>
              start(async () => {
                const res = await action(typed);
                if (res.ok) {
                  toast.success(res.message ?? "Устгагдлаа.");
                  setOpen(false);
                } else toast.error(res.message ?? "Алдаа гарлаа.");
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Устгах
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type UserRowView = {
  id: string;
  email: string;
  role: AppRole | null;
  banned: boolean;
  isSelf: boolean;
  /** Imported member records with this e-mail that are not linked to an account yet. */
  linkCandidates: { id: string; name: string }[];
};

/** Account actions for one row. The server re-checks every guard (self, last admin). */
export function UserRowActions({
  row,
  changeRole,
  setBanned,
  deleteAccount,
  linkMember,
  refresh,
}: {
  row: UserRowView;
  changeRole: (action: string) => Promise<ActionState>;
  setBanned: (banned: boolean) => Promise<ActionState>;
  deleteAccount: (confirmEmail: string) => Promise<ActionState>;
  linkMember: (memberId: string) => Promise<ActionState>;
  refresh: Run;
}) {
  const { pending, run } = useRun();
  if (row.isSelf) {
    return (
      <p className="text-xs text-muted-foreground">Өөрийн бүртгэлийн эрхийг өөр админ өөрчилнө.</p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {row.linkCandidates.map((m) => (
        <Button
          key={m.id}
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () => linkMember(m.id),
              `Энэ бүртгэлийг «${m.name}» гишүүнтэй холбож, гишүүний эрх олгох уу?`,
            )
          }
        >
          <Link2 /> Гишүүнтэй холбох: {m.name}
        </Button>
      ))}
      {row.role !== "admin" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => changeRole("make-admin"), "Админ эрх олгох уу? Бүх эрхтэй болно.")
          }
        >
          <ShieldCheck /> Админ болгох
        </Button>
      )}
      {row.role !== "member" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => changeRole("make-member"))}
        >
          <UserRound /> Гишүүн болгох
        </Button>
      )}
      {row.role && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => changeRole("remove-role"), "Эрхийг хасах уу?")}
        >
          <UserMinus /> Эрх хасах
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(
            () => setBanned(!row.banned),
            row.banned
              ? undefined
              : "Идэвхгүй болгох уу? Нэвтрэх боломжгүй болно, мэдээлэл хадгалагдана.",
          )
        }
      >
        <Ban /> {row.banned ? "Идэвхжүүлэх" : "Идэвхгүй болгох"}
      </Button>
      <DeleteAccountDialog email={row.email} action={deleteAccount} />
      <Button
        size="icon-sm"
        variant="ghost"
        disabled={pending}
        aria-label="Clerk-ээс шинэчлэх"
        title="Clerk-ээс шинэчлэх"
        onClick={() => run(refresh)}
      >
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      </Button>
    </div>
  );
}
