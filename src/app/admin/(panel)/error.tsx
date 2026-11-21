"use client";

import { useEffect } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("admin", "render failed", error);
  }, [error]);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center ring-1 ring-border"
    >
      <BrandLogo variant="mark" locale="mn" alt="" height={120} />
      <h1 className="text-xl font-bold">Алдаа гарлаа</h1>
      <p className="text-sm text-muted-foreground">
        Хуудсыг ачаалж чадсангүй. Дахин оролдоно уу. Асуудал давтагдвал техникийн хариуцагчид
        хандана уу
        {error.digest ? ` (код: ${error.digest})` : ""}.
      </p>
      <Button onClick={reset}>Дахин оролдох</Button>
    </div>
  );
}
