"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionState } from "@/lib/admin/action-state";

/** Confirmation dialog that calls a bound Server Action (e.g. delete). */
export function ConfirmAction({
  action,
  title = "Устгах уу?",
  description = "Энэ үйлдлийг буцаах боломжгүй.",
  confirmLabel = "Устгах",
  trigger,
}: {
  action: () => Promise<ActionState>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={confirmLabel}
            className="text-destructive"
          >
            <Trash2 />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Болих</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await action();
                if (res.ok) {
                  toast.success(res.message ?? "Амжилттай");
                  setOpen(false);
                } else toast.error(res.message ?? "Алдаа гарлаа");
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
