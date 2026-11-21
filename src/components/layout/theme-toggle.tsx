"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ORDER = ["light", "dark", "system"] as const;
type Mode = (typeof ORDER)[number];
const ICONS = { light: Sun, dark: Moon, system: Laptop } satisfies Record<Mode, unknown>;

const noop = () => () => {};
/** False during SSR and hydration, true after: the saved theme is only known in the browser. */
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** Short colour cross-fade when the visitor switches (never on first load; off with reduced motion). */
function withTransition(apply: () => void) {
  const root = document.documentElement;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 320);
  }
  apply();
}

function useMode(): [Mode, (m: Mode) => void] {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const mode = (mounted && ORDER.includes(theme as Mode) ? theme : "system") as Mode;
  return [mode, (m) => withTransition(() => setTheme(m))];
}

/** Header: one button that cycles light → dark → system; the icon shows the current mode. */
export function ThemeToggle() {
  const t = useTranslations("Theme");
  const [mode, setMode] = useMode();
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]!;
  const Icon = ICONS[mode];
  const label = t("cycle", { current: t(mode), next: t(next) });
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setMode(next)}
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  );
}

/** Mobile drawer: the three modes as a segmented control. */
export function ThemeChoice() {
  const t = useTranslations("Theme");
  const [mode, setMode] = useMode();
  return (
    <div
      role="radiogroup"
      aria-label={t("toggle")}
      className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1"
    >
      {ORDER.map((m) => {
        const Icon = ICONS[m];
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-muted-foreground transition-colors",
              mode === m && "bg-card text-foreground shadow-soft",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {t(m)}
          </button>
        );
      })}
    </div>
  );
}
