import { getTranslations } from "next-intl/server";
import { NotFoundContent } from "@/components/common/not-found-content";
import { Link } from "@/i18n/navigation";

export default async function LocaleNotFound() {
  const t = await getTranslations("Common");
  return <NotFoundContent homeLink={<Link href="/">{t("backHome")}</Link>} />;
}
