import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/common/count-up";
import { cn } from "@/lib/utils";

const tones = {
  cyan: "bg-brand-cyan-soft text-brand-cyan-strong",
  purple: "bg-brand-purple-soft text-brand-purple-strong",
  green: "bg-brand-green-soft text-brand-green-strong",
  gold: "bg-brand-gold-soft text-brand-gold-strong",
  coral: "bg-brand-coral-soft text-brand-coral-strong",
  blue: "bg-brand-blue-soft text-brand-blue-strong",
} as const;
export type StatTone = keyof typeof tones;

/**
 * One headline number: icon + value (counts up once, final value server-rendered, tabular
 * figures, width reserved — no layout shift) + a short label.
 */
export function StatTile({
  icon: Icon,
  value,
  label,
  tone = "cyan",
  className,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3.5 sm:gap-4", className)}>
      <span
        aria-hidden="true"
        className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", tones[tone])}
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-[clamp(1.6rem,1.3rem+1.2vw,2.25rem)] leading-none font-extrabold tabular-nums">
          <CountUp value={value} />
        </p>
        <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
