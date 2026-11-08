"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="space-y-3 rounded-2xl bg-card p-8 text-center ring-1 ring-border">
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
