"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const SHORT: Record<Locale, string> = { mn: "МН", en: "EN" };

/**
 * Switches to the other language on the same page, keeping the query (filters, tab, page) and
 * the #section. The label names the target language in that language («English» / «Монгол»).
 */
function useSwitch() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const target = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  const go = () =>
    startTransition(() => {
      const { search, hash } = window.location;
      router.replace(`${pathname}${search}${hash}`, { locale: target, scroll: false });
    });
  return { target, go, pending };
}

/** Header: compact button «EN» / «МН». */
export function LocaleSwitcher() {
  const t = useTranslations("Locale");
  const { target, go, pending } = useSwitch();
  const label = t("switchTo", { language: t(target) });
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={go}
      disabled={pending}
      title={label}
      className="w-auto min-w-11 gap-1 px-2.5"
    >
      <Languages className="size-4.5" aria-hidden="true" />
      {/* Name = visible "EN" + the full action (WCAG 2.5.3: the label contains the visible text). */}
      {/* Icon only at lg–2xl, where the desktop nav needs the room. */}
      <span lang={target} className="text-xs font-bold max-sm:sr-only lg:max-2xl:sr-only">
        {SHORT[target]}
      </span>
      <span className="sr-only">{label}</span>
    </Button>
  );
}

/** Mobile drawer: full-width button with the target language name. */
export function LocaleChoice({ className }: { className?: string }) {
  const t = useTranslations("Locale");
  const { target, go, pending } = useSwitch();
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={go}
      disabled={pending}
      className={cn("w-full", className)}
    >
      <Languages aria-hidden="true" />
      <span lang={target}>{t(target)}</span>
    </Button>
  );
}
