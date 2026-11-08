"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("body")}</p>
      <Button size="lg" onClick={reset}>
        <RotateCcw /> {t("retry")}
      </Button>
    </div>
  );
}
