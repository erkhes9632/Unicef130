"use client";

import { Loader2, MailCheck, MailOpen } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/admin/action-state";

export function MessageReadToggle({
  read,
  action,
}: {
  read: boolean;
  action: (read: boolean) => Promise<ActionState>;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={read ? "ghost" : "outline"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await action(!read);
          if (!res.ok) toast.error(res.message ?? "Алдаа");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : read ? <MailOpen /> : <MailCheck />}
      {read ? "Уншаагүй болгох" : "Уншсан"}
    </Button>
  );
}
