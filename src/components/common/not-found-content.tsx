import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { DecorativeShapes } from "./decorative-shapes";

/** Shared 404 body. `homeLink` lets callers pass a locale-aware or plain link. */
export async function NotFoundContent({ homeLink }: { homeLink: React.ReactElement }) {
  const t = await getTranslations();
  return (
    <div className="relative isolate flex flex-1 items-center">
      <DecorativeShapes variant="hero" />
      <div className="container-page py-24 text-center">
        <p className="font-heading text-7xl font-extrabold text-brand-cyan sm:text-8xl">
          {t("NotFound.code")}
        </p>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{t("NotFound.title")}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t("NotFound.description")}</p>
        <Button asChild size="lg" className="mt-8">
          {homeLink}
        </Button>
      </div>
    </div>
  );
}
