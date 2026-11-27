import "server-only";
import { getTranslations } from "next-intl/server";
import type { YearLabels } from "./year-groups";

/** Labels of the school-year chips and headings ({year} is filled in the browser). */
export async function getYearLabels(): Promise<YearLabels> {
  const t = await getTranslations("SchoolYear");
  return {
    label: t("filterLabel"),
    all: t("all"),
    heading: t.raw("heading") as string,
    continued: t.raw("continued") as string,
  };
}
