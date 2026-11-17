import { ChevronDown, HelpCircle } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinEmptyState } from "@/components/common/join-empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { listFaqs } from "@/lib/data/faq";
import { paragraphs } from "@/lib/data/settings";
import { jsonLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Faq" });
  return pageMetadata({
    locale,
    path: "/faq",
    title: t("metaTitle"),
    description: t("description"),
  });
}

/** Questions and answers written by the admins (Админ → Түгээмэл асуулт). */
export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Faq");
  const items = await listFaqs(locale);
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section className="pt-8 sm:pt-12">
        {items.length === 0 ? (
          <JoinEmptyState icon={HelpCircle} title={t("empty")} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-3">
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
            {items.map((f) => (
              <details
                key={f.id}
                className="group rounded-2xl bg-card ring-1 ring-border open:ring-brand-cyan"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <ChevronDown
                    className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <div className="space-y-3 px-5 pb-5 text-muted-foreground">
                  {paragraphs(f.answer).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-3 text-center">
          <p className="font-semibold">{t("more")}</p>
          <Button asChild variant="outline">
            <Link href="/contact">{t("contact")}</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
