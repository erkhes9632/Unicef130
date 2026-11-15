"use client";

import { useClerk } from "@clerk/nextjs";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cancelSignup,
  deleteMyAccount,
  signUpForEvent,
  updateMyClass,
  type MeResult,
} from "@/app/[locale]/me/actions";
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

function useMeAction() {
  const t = useTranslations("Me");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<MeResult>, success?: (res: MeResult) => string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (success) toast.success(success(res));
      } else toast.error(t(`errors.${res.error ?? "server"}`));
    });
  return { pending, run, t };
}

export function ClassForm({ className }: { className: string }) {
  const { pending, run, t } = useMeAction();
  const [value, setValue] = useState(className);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => updateMyClass(value),
          () => t("classSaved"),
        );
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">{t("class")}</span>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={10}
          className="w-28"
          aria-describedby="me-class-hint"
        />
      </label>
      <Button type="submit" variant="outline" disabled={pending || value.trim() === className}>
        {pending && <Loader2 className="animate-spin" />} {t("save")}
      </Button>
      <p id="me-class-hint" className="w-full text-xs text-muted-foreground">
        {t("classHint")}
      </p>
    </form>
  );
}

export function SignupButton({
  eventId,
  status,
  open,
}: {
  eventId: string;
  status: "registered" | "waitlist" | "cancelled" | "attended" | "absent" | null;
  open: boolean;
}) {
  const { pending, run, t } = useMeAction();
  const active = status === "registered" || status === "waitlist";
  if (status === "attended" || status === "absent") return null;
  if (active)
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(
            () => cancelSignup(eventId),
            () => t("signupCancelled"),
          )
        }
      >
        {pending && <Loader2 className="animate-spin" />} {t("cancelSignup")}
      </Button>
    );
  return (
    <Button
      size="sm"
      disabled={pending || !open}
      onClick={() =>
        run(
          () => signUpForEvent(eventId),
          (res) => (res.status === "waitlist" ? t("signedUpWaitlist") : t("signedUp")),
        )
      }
    >
      {pending && <Loader2 className="animate-spin" />} {open ? t("signUp") : t("signupClosed")}
    </Button>
  );
}

/** "Бүртгэлээ устгах" with a typed confirmation word; signs out afterwards. */
export function DeleteMyAccount({ disabledReason }: { disabledReason?: string }) {
  const t = useTranslations("Me");
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [pending, start] = useTransition();
  if (disabledReason) return <p className="text-sm text-muted-foreground">{disabledReason}</p>;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          <Trash2 /> {t("deleteAccount")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>{t("deleteBody")}</DialogDescription>
        </DialogHeader>
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold">{t("deleteConfirmLabel")}</span>
          <Input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={pending || word.trim() === ""}
            onClick={() =>
              start(async () => {
                const res = await deleteMyAccount(word);
                if (!res.ok) {
                  toast.error(t(`errors.${res.error ?? "server"}`));
                  return;
                }
                toast.success(t("deleted"));
                // The Clerk user is already gone (its sessions with it): clear the local
                // session if possible and leave the member area either way.
                await signOut().catch(() => undefined);
                window.location.assign("/");
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} {t("deleteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
