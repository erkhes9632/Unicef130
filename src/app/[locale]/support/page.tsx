import { HandHeart, Handshake, Megaphone, Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { getSiteSettings } from "@/lib/data/settings";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/support">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Support" });
  return { title: t("metaTitle"), description: t("description") };
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
  {
    key: "share",
    icon: Megaphone,
    tone: "bg-brand-green-soft text-brand-green-strong",
    href: "/news",
  },
] as const;

function safeExternalUrl(url: string) {
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export default async function SupportPage({ params }: PageProps<"/[locale]/support">) {
  await resolveLocale(params);
  const t = await getTranslations();
  const { donationUrl } = await getSiteSettings();
  const donateHref = safeExternalUrl(donationUrl);

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
            <li
              key={key}
              className="group relative flex gap-4 rounded-3xl bg-card p-6 ring-1 ring-border transition-shadow hover:shadow-lg"
            >
              <span
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-2xl",
                  tone,
                )}
              >
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
        </ul>

        <div className="mt-10 grid gap-6 rounded-[2rem] bg-brand-gold-soft p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold">{t("Support.donateTitle")}</h2>
            <p className="text-muted-foreground">{t("Support.donateBody")}</p>
            {!donateHref && (
              <p className="text-sm font-semibold">{t("Support.donateUnavailable")}</p>
            )}
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
