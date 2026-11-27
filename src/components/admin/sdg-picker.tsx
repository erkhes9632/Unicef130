"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { SDGS } from "@/lib/sdg";
import { cn } from "@/lib/utils";

const ALL = Array.from({ length: 17 }, (_, i) => i + 1);
/** Text on the official goal colours (lib/sdg.ts picks light or dark per goal for contrast). */
const INK = { light: "#ffffff", dark: "#000000" } as const;

/**
 * «Тогтвортой хөгжлийн зорилго»: 17 toggle chips in the official colours (number + short
 * Mongolian name), several can be chosen. Keyboard: Tab to a chip, Space/Enter toggles. The
 * form receives the same "1, 10" text as before (hidden input), so the server is unchanged.
 */
export function SdgPicker({
  name,
  defaultValue = [],
  labelledBy,
}: {
  name: string;
  defaultValue?: number[];
  /** Id of the field's visible label. */
  labelledBy: string;
}) {
  const [chosen, setChosen] = useState<Set<number>>(() => new Set(defaultValue));
  const toggle = (n: number) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  return (
    <div role="group" aria-labelledby={labelledBy}>
      <input type="hidden" name={name} value={[...chosen].sort((a, b) => a - b).join(", ")} />
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
        {ALL.map((n) => {
          const sdg = SDGS[n]!;
          const on = chosen.has(n);
          return (
            <li key={n}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(n)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-left text-xs font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  on ? "border-transparent" : "border-border bg-card hover:bg-muted",
                )}
                style={on ? { backgroundColor: sdg.color, color: INK[sdg.text] } : undefined}
              >
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-extrabold"
                  style={{
                    // A darker chip under white digits, a lighter one under dark digits (contrast).
                    backgroundColor: on
                      ? sdg.text === "light"
                        ? "rgb(0 0 0 / 0.22)"
                        : "rgb(255 255 255 / 0.4)"
                      : sdg.color,
                    color: on ? "inherit" : INK[sdg.text],
                  }}
                >
                  {n}
                </span>
                <span className="min-w-0 flex-1 leading-tight">{sdg.mn}</span>
                {on && <Check className="size-4 shrink-0" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
