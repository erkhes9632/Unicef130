import "server-only";
import { or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { MIN_SEARCH, PAGE_SIZE } from "./list-limits";

type Params = Record<string, string | string[] | undefined>;

/** A trimmed string parameter ("" when missing or repeated). */
export function param(params: Params, key: string, max = 80): string {
  const v = params[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** The search text, or "" when shorter than MIN_SEARCH. */
export function searchParam(params: Params): string {
  const q = param(params, "q");
  return [...q].length >= MIN_SEARCH ? q : "";
}

/** 1-based page number from `?page=` (bad values → 1). */
export function pageParam(params: Params): number {
  const n = Number.parseInt(param(params, "page", 6), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

export const pageOffset = (page: number) => (page - 1) * PAGE_SIZE;

/**
 * Case forms of a search term. SQLite's LIKE folds ASCII only, so Cyrillic needs the forms
 * people actually type and store: as typed, lower case, Capitalised, UPPER.
 */
export function caseVariants(q: string): string[] {
  const lower = q.toLocaleLowerCase("mn");
  const cap = lower.charAt(0).toLocaleUpperCase("mn") + lower.slice(1);
  return [...new Set([q, lower, cap, q.toLocaleUpperCase("mn")])];
}

const escapeLike = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * `col` starts with the term, or one of its words does ("Батын Анужин" matches "ану"). The
 * prefix form can use the COLLATE NOCASE indexes (migration 0011); word starts scan the
 * (small) table.
 */
export function wordPrefix(columns: AnyColumn[], q: string): SQL {
  const parts: SQL[] = [];
  for (const col of columns)
    for (const v of caseVariants(q)) {
      const e = escapeLike(v);
      parts.push(sql`${col} LIKE ${`${e}%`} ESCAPE '\\'`);
      parts.push(sql`${col} LIKE ${`% ${e}%`} ESCAPE '\\'`);
    }
  return or(...parts)!;
}
