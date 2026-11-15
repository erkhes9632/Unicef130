import { Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Shown instead of a public form when spam protection is not configured in production. */
export async function FormsUnavailable() {
  const t = await getTranslations("Forms");
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-3xl bg-brand-gold-soft p-8 text-center"
    >
      <Wrench className="size-10 text-brand-gold-strong" aria-hidden="true" />
      <h2 className="text-xl font-extrabold">{t("unavailableTitle")}</h2>
      <p className="max-w-md text-muted-foreground">{t("unavailable")}</p>
      <Link href="/" className="font-semibold text-brand-cyan-strong hover:underline">
        {t("unavailableBack")}
      </Link>
    </div>
  );
}
