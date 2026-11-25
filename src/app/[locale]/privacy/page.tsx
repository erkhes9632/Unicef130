import { Clock, Eye, KeyRound, ListChecks, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/common/page-hero";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { isSheetsConfigured } from "@/lib/applications/sheets-sync";
import { getSiteSettings } from "@/lib/data/settings";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return pageMetadata({
    locale,
    path: "/privacy",
    title: t("metaTitle"),
    description: t("description"),
  });
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-card p-6 ring-1 ring-border sm:p-8">
      <h2 className="flex items-center gap-3 text-xl font-extrabold">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-cyan-soft text-brand-cyan-strong">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-brand-cyan-strong">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Privacy policy. Facts come from the code, not from copy: the retention period is the admin
 * setting the daily clean-up uses, the Google Sheets line only shows while sync is configured,
 * and the e-mail address only when the admins have filled it in.
 */
export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  await resolveLocale(params);
  const t = await getTranslations("Privacy");
  const [settings, sheets] = await Promise.all([getSiteSettings(), isSheetsConfigured()]);
  const email = settings.contact.email.trim();

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section className="pt-8 sm:pt-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-lg">{t("intro")}</p>

          <Block icon={ListChecks} title={t("collectTitle")}>
            <Bullets items={t.raw("collect") as string[]} />
            <p>{t("notCollected")}</p>
            <p>{t("analytics")}</p>
          </Block>

          <Block icon={KeyRound} title={t("googleTitle")}>
            <p>{t("google")}</p>
          </Block>

          <Block icon={Eye} title={t("whoTitle")}>
            <Bullets items={[...(t.raw("who") as string[]), ...(sheets ? [t("sheets")] : [])]} />
          </Block>

          <Block icon={Clock} title={t("retentionTitle")}>
            <Bullets
              items={[
                t("retentionRejected", { days: settings.membership.rejectedRetentionDays }),
                t("retentionAccount"),
                t("retentionMessages"),
              ]}
            />
          </Block>

          <Block icon={Trash2} title={t("deleteTitle")}>
            <p>{t("deleteMember")}</p>
            <p>{t("deleteOthers")}</p>
            {email && (
              <p>
                {t.rich("deleteEmail", {
                  email,
                  mail: (chunks) => (
                    <a
                      href={`mailto:${email}`}
                      className="font-semibold text-brand-cyan-strong underline-offset-4 hover:underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <Link href="/contact">{t("contactLink")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/me" prefetch={false}>
                  {t("meLink")}
                </Link>
              </Button>
            </div>
          </Block>

          <p className="text-sm text-muted-foreground">{t("updated")}</p>
        </div>
      </Section>
    </>
  );
}
