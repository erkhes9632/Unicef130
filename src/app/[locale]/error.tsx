"use client";

import { RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");
  const tc = useTranslations("Common");
  const locale = useLocale() === "en" ? "en" : "mn";
  useEffect(() => {
    logger.error("page", "render failed", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <BrandLogo variant="mark" locale={locale} alt={tc("logoAlt")} height={120} />
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("body")}</p>
      <Button size="lg" onClick={reset}>
        <RotateCcw /> {t("retry")}
      </Button>
    </div>
  );
}
