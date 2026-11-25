import { HandHeart, Handshake, Mail, Megaphone, Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SocialIcon } from "@/components/brand/social-icon";
import { SocialLinks } from "@/components/brand/social-links";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { CopyButton } from "@/components/contact/copy-button";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { pick } from "@/lib/data/localize";
import { getSiteSettings, paragraphs, publicContact, safeExternalUrl } from "@/lib/data/settings";
import { pageMetadata } from "@/lib/seo";
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
    href: "#contact-us",
  },
  {
    key: "partner",
    icon: Handshake,
    tone: "bg-brand-purple-soft text-brand-purple-strong",
    href: "#contact-us",
  },
] as const;

const card = "group relative flex gap-4 rounded-3xl bg-card p-6 ring-1 ring-border hover:shadow-lg";
const iconBox = "flex size-14 shrink-0 items-center justify-center rounded-2xl";

export default async function SupportPage({ params }: PageProps<"/[locale]/support">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations();
  const { donation, socials, contact, support } = await getSiteSettings();
  // The page text is edited in admin («Дэмжих» хуудас).
  const way = (key: (typeof ways)[number]["key"] | "share") => ({
    title: pick(locale, support.ways[key].title, support.ways[key].titleEn),
    body: pick(locale, support.ways[key].body, support.ways[key].bodyEn),
  });
  const channels = publicContact(locale, contact);
  const donateHref = safeExternalUrl(donation.url);
  const donationText = paragraphs(pick(locale, donation.text, donation.textEn));

  return (
    <>
      <PageHero
        eyebrow={t("Support.eyebrow")}
        eyebrowColor="gold"
        title={t("Support.title")}
        description={pick(locale, support.intro, support.introEn) || t("Support.description")}
      />
      <Section>
        <ul className="reveal-group grid gap-4 sm:grid-cols-2">
          {ways.map(({ key, icon: Icon, tone, href }) => (
            <li key={key} className={card}>
              <span className={cn(iconBox, tone)}>
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold">
                  {href.startsWith("#") ? (
                    <a href={href} className="after:absolute after:inset-0">
                      {way(key).title}
                    </a>
                  ) : (
                    <Link href={href} className="after:absolute after:inset-0">
                      {way(key).title}
                    </Link>
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{way(key).body}</p>
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
                  <h2 className="text-lg font-bold">{way("share").title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{way("share").body}</p>
                </div>
                <SocialLinks socials={socials} variant="icons" />
              </div>
            </li>
          )}
        </ul>

        <div className="mt-10 grid gap-6 rounded-[2rem] bg-brand-gold-soft p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold">
              {pick(locale, support.donate.title, support.donate.titleEn)}
            </h2>
            <p className="text-muted-foreground">
              {pick(locale, support.donate.body, support.donate.bodyEn)}
            </p>
            {donationText.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
          {donateHref && (
            <Button asChild size="lg">
              <a href={donateHref} target="_blank" rel="noopener noreferrer">
                {t("Support.donateButton")}
              </a>
            </Button>
          )}
        </div>

        {(channels.email || channels.instagram) && (
          <section
            id="contact-us"
            aria-labelledby="contact-us-title"
            className="mt-12 scroll-mt-24"
          >
            <h2 id="contact-us-title" className="text-2xl font-extrabold">
              {t("Support.contactTitle")}
            </h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {channels.email && (
                <li className="flex min-w-0 flex-col gap-4 rounded-3xl bg-card p-6 ring-1 ring-border">
                  <span className={cn(iconBox, "bg-brand-cyan-soft text-brand-cyan-strong")}>
                    <Mail className="size-7" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {t("Support.emailLabel")}
                    </h3>
                    <p className="mt-1 text-lg font-bold break-all sm:text-xl">{channels.email}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <Button asChild size="lg">
                      <a href={`mailto:${channels.email}`}>{t("Support.emailButton")}</a>
                    </Button>
                    <CopyButton
                      value={channels.email}
                      label={t("Footer.copyEmail")}
                      copied={t("Footer.copied")}
                      className="ring-1 ring-border"
                    />
                  </div>
                </li>
              )}
              {channels.instagram && (
                <li className="flex min-w-0 flex-col gap-4 rounded-3xl bg-card p-6 ring-1 ring-border">
                  <span className={cn(iconBox, "bg-brand-coral-soft text-brand-coral-strong")}>
                    <SocialIcon platform="instagram" className="size-7" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-muted-foreground">Instagram</h3>
                    <p className="mt-1 text-lg font-bold break-all sm:text-xl">
                      {channels.instagram.handle}
                    </p>
                  </div>
                  <div className="mt-auto">
                    <Button asChild size="lg" variant="outline">
                      <a href={channels.instagram.url} target="_blank" rel="noopener noreferrer">
                        {t("Support.instagramButton")}
                        <span className="sr-only"> ({t("Common.newTab")})</span>
                      </a>
                    </Button>
                  </div>
                </li>
              )}
            </ul>
          </section>
        )}
      </Section>
    </>
  );
}
