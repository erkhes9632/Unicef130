"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Copies `value` (an e-mail address) and confirms with a toast. Labels come from the server. */
export function CopyButton({
  value,
  label,
  copied,
  className,
}: {
  value: string;
  /** Accessible name, e.g. "И-мэйл хаягийг хуулах". */
  label: string;
  /** Toast text, e.g. "Хуулагдлаа". */
  copied: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success(copied);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // Clipboard blocked (old browser, permissions): the address stays visible to copy by hand.
    }
  }
  const Icon = done ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
