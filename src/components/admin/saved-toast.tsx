"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * After a save that redirects to a list (`?saved=1`): one toast, then the flag leaves the
 * address so a refresh or the back button doesn't repeat it.
 */
export function SavedToast({ message = "Хадгалагдлаа." }: { message?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const saved = params.get("saved") === "1";
  useEffect(() => {
    if (!saved) return;
    toast.success(message);
    const next = new URLSearchParams(params.toString());
    next.delete("saved");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [saved, message, params, pathname, router]);
  return null;
}
