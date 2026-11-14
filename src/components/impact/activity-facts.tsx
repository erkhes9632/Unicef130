import { Coins, Globe, Handshake, HeartHandshake, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ActivityFacts as Facts } from "@/lib/data/events";
import { getSiteSettings } from "@/lib/data/settings";
import { formatMnt, formatNumber } from "@/lib/dates/format";
import { cn } from "@/lib/utils";

/** Small facts box for an activity: reach, money raised, partners. Unknown values are omitted. */
export async function ActivityFacts({ facts, className }: { facts: Facts; className?: string }) {
  const t = await getTranslations("Activity");
  // Organisation names are typed in Mongolian; use the English name from site settings if known.
  const locale = await getLocale();
  const { partners } = await getSiteSettings();
  const name = (n: string) => (locale === "en" && partners.find((p) => p.name === n)?.nameEn) || n;
  const rows = [
    facts.inPerson && { icon: Users, label: t("inPerson"), value: facts.inPerson },
    facts.online !== null &&
      facts.online > 0 && { icon: Globe, label: t("online"), value: formatNumber(facts.online) },
    facts.donationAmount && {
      icon: Coins,
      label: t("donation"),
      value: formatMnt(facts.donationAmount),
    },
    facts.partners.length > 0 && {
      icon: Handshake,
      label: t("partners"),
      value: facts.partners.map(name).join(", "),
    },
    facts.beneficiaries.length > 0 && {
      icon: HeartHandshake,
      label: t("beneficiaries"),
      value: facts.beneficiaries.map(name).join(", "),
    },
  ].filter((r): r is { icon: typeof Users; label: string; value: string } => !!r);
  if (rows.length === 0) return null;

  return (
    <section
      aria-label={t("factsTitle")}
      className={cn("rounded-3xl bg-brand-cyan-soft p-5 sm:p-6", className)}
    >
      <h2 className="mb-4 text-sm font-bold tracking-wide text-muted-foreground uppercase">
        {t("factsTitle")}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-brand-cyan-strong">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-bold text-muted-foreground uppercase">{label}</dt>
              <dd className="font-heading text-lg font-extrabold break-words">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
