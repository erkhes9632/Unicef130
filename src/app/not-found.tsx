import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NotFoundContent } from "@/components/common/not-found-content";

// Fallback 404 for paths outside [locale] (e.g. unknown /admin/* routes).
export default async function RootNotFound() {
  const t = await getTranslations("Common");
  return (
    <main className="flex flex-1 flex-col">
      <NotFoundContent homeLink={<Link href="/">{t("backHome")}</Link>} />
    </main>
  );
}
