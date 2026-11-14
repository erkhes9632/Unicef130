import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SDGS } from "@/lib/sdg";
import { cn } from "@/lib/utils";

/** Official-color SDG badges: number + short name, each linking to the posts for that goal. */
export async function SdgBadges({
  sdgs,
  size = "default",
  linked = true,
  className,
}: {
  sdgs: number[];
  size?: "sm" | "default";
  linked?: boolean;
  className?: string;
}) {
  const goals = sdgs.filter((n) => SDGS[n]);
  if (goals.length === 0) return null;
  const locale = await getLocale();
  const t = await getTranslations("Activity");
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label={t("sdgTitle")}>
      {goals.map((n) => {
        const info = SDGS[n]!;
        const label = locale === "en" ? info.en : info.mn;
        const body = (
          <>
            <span className="font-heading font-extrabold">SDG {n}</span>
            {size === "default" && <span className="font-medium">{label}</span>}
          </>
        );
        const cls = cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs shadow-sm",
          info.text === "light" ? "text-white" : "text-brand-night",
          linked && "transition-opacity hover:opacity-85",
        );
        return (
          <li key={n}>
            {linked ? (
              <Link
                href={{ pathname: "/news", query: { sdg: String(n) } }}
                style={{ backgroundColor: info.color }}
                className={cls}
                title={`SDG ${n}: ${label}`}
              >
                {body}
              </Link>
            ) : (
              <span style={{ backgroundColor: info.color }} className={cls} title={label}>
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
