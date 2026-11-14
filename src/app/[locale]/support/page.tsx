import { HandHeart, Handshake, Megaphone, Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { pageMetadata } from "@/lib/seo";
import { SocialLinks } from "@/components/brand/social-links";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, paragraphs, safeExternalUrl } from "@/lib/data/settings";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/support">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Support" });
  return pageMetadata({
    locale,
    path: "/support",
    title: t("metaTitle"),
    description: t("description"),
  });
}

const ways = [
  {
    key: "volunteer",
    icon: HandHeart,
    tone: "bg-brand-cyan-soft text-brand-cyan-strong",
    href: "/join",
  },
  {
    key: "donateItems",
    icon: Package,
    tone: "bg-brand-gold-soft text-brand-gold-strong",
    href: "/contact",
  },
  {
    key: "partner",
    icon: Handshake,
    tone: "bg-brand-purple-soft text-brand-purple-strong",
    href: "/contact",
  },
] as const;

const card =
  "group relative flex gap-4 rounded-3xl bg-card p-6 ring-1 ring-border transition-shadow hover:shadow-lg";
const iconBox = "flex size-14 shrink-0 items-center justify-center rounded-2xl";

export default async function SupportPage({ params }: PageProps<"/[locale]/support">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations();
  const { donation, socials } = await getSiteSettings();
  const donateHref = safeExternalUrl(donation.url);
  const donationText = paragraphs(pick(locale, donation.text, donation.textEn));

  return (
    <>
      <PageHero
        eyebrow={t("Support.eyebrow")}
        eyebrowColor="gold"
        title={t("Support.title")}
        description={t("Support.description")}
      />
      <Section>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ways.map(({ key, icon: Icon, tone, href }) => (
            <li key={key} className={card}>
              <span className={cn(iconBox, tone)}>
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold">
                  <Link href={href} className="after:absolute after:inset-0">
                    {t(`Support.ways.${key}.title`)}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`Support.ways.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
          {/* "Spread the word" points to the club's social links, so it needs at least one. */}
          {socials.length > 0 && (
            <li className={cn(card, "flex-col sm:flex-row")}>
              <span className={cn(iconBox, "bg-brand-green-soft text-brand-green-strong")}>
                <Megaphone className="size-7" aria-hidden="true" />
              </span>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-bold">{t("Support.ways.share.title")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Support.ways.share.body")}
                  </p>
                </div>
                <SocialLinks socials={socials} variant="icons" />
              </div>
            </li>
          )}
        </ul>

        <div className="mt-10 grid gap-6 rounded-[2rem] bg-brand-gold-soft p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold">{t("Support.donateTitle")}</h2>
            <p className="text-muted-foreground">{t("Support.donateBody")}</p>
            {donationText.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {donateHref && (
              <Button asChild size="lg">
                <a href={donateHref} target="_blank" rel="noopener noreferrer">
                  {t("Support.donateButton")}
                </a>
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="bg-background">
              <Link href="/contact">{t("Support.contactCta")}</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
