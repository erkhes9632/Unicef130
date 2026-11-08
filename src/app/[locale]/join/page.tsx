import { Check, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinForm } from "@/components/forms/join-form";
import { PageHero } from "@/components/common/page-hero";
import { resolveLocale } from "@/i18n/locale";
import { getTurnstileSiteKey } from "@/lib/integrations/turnstile";

export async function generateMetadata({ params }: PageProps<"/[locale]/join">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Join" });
  return { title: t("metaTitle"), description: t("description") };
}

export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  await resolveLocale(params);
  const t = await getTranslations("Join");
  const why = t.raw("why") as string[];
  const turnstileSiteKey = await getTurnstileSiteKey();

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="container-page grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-[2rem] bg-card p-5 ring-1 ring-border sm:p-8">
          <JoinForm turnstileSiteKey={turnstileSiteKey} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-3xl bg-brand-cyan-soft p-6">
            <h2 className="mb-4 text-xl font-extrabold">{t("whyTitle")}</h2>
            <ul className="space-y-3">
              {why.map((w) => (
                <li key={w} className="flex gap-3">
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-brand-cyan-strong"
                    aria-hidden="true"
                  />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-muted/60 p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              <ShieldCheck className="size-5 text-brand-green-strong" aria-hidden="true" />
              {t("privacyTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("privacy")}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
