import { getTranslations, setRequestLocale } from "next-intl/server";
import { DecorativeShapes } from "@/components/common/decorative-shapes";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Temporary home page (Phase 1). Phase 2 builds the full homepage.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as "mn" | "en");
  const t = await getTranslations();

  return (
    <div className="relative isolate flex flex-1 items-center">
      <DecorativeShapes variant="hero" />
      <div className="container-page py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold sm:text-6xl">
          {t("Home.placeholderTitle")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          {t("Home.placeholderBody")}
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/join">{t("Common.joinCta")}</Link>
        </Button>
      </div>
    </div>
  );
}
