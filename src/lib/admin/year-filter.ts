import "server-only";
import type { FilterField } from "@/components/admin/filter-bar";
import { displayYear, isSchoolYear, sortYearsDesc } from "@/lib/school-year";
import { param } from "./list-query";

type Params = Record<string, string | string[] | undefined>;

/** `?year=` when it is a valid school year, else "" (every year). */
export function yearParam(params: Params): string {
  const y = param(params, "year", 9);
  return isSchoolYear(y) ? y : "";
}

/**
 * The «Хичээлийн жил» select of an admin list (applies at once, like every FilterBar select):
 * "Бүх жил", then the years that have rows (and the current one), newest first.
 */
export function yearFilterField(known: readonly (string | null)[], current: string): FilterField {
  return {
    type: "select",
    name: "year",
    label: "Хичээлийн жил",
    options: [
      { value: "", label: "Бүх жил" },
      ...sortYearsDesc([current, ...known]).map((y) => ({
        value: y,
        label: y === current ? `${displayYear(y)} (одоогийн)` : displayYear(y),
      })),
    ],
  };
}
