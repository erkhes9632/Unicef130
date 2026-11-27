import "server-only";
import { and, count, eq, lt } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { events, members, settings } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { getLatestImpact, getReportMembership } from "@/lib/data/impact";
import { formatNumber } from "@/lib/dates/format";
import { nowMs } from "@/lib/dates/ub-time";
import { logger } from "@/lib/logger";
import { currentSchoolYear } from "@/lib/school-year";
import {
  MAX_FEATURED_STATS,
  defaultSettings,
  instagramUrl,
  parseSettings,
  type ContactInfo,
  type SiteSettings,
} from "@/lib/settings/types";
import { pick } from "./localize";

/** Obvious sample values that must never reach the public site. */
function isPlaceholder(value: string) {
  return /@example\.(com|org|mn)$/i.test(value);
}

function sanitizeContact(c: ContactInfo): ContactInfo {
  return { ...c, email: isPlaceholder(c.email) ? "" : c.email };
}

/**
 * All site settings from D1 (admin → Сайтын тохиргоо). Missing rows use the empty defaults in
 * src/lib/settings/types.ts; if D1 is unavailable the defaults are used so the site never breaks.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const db = await getDb();
    const rows = await db.select().from(settings);
    const parsed = parseSettings(new Map(rows.map((r) => [r.key, r.value])));
    return { ...parsed, contact: sanitizeContact(parsed.contact) };
  } catch (err) {
    logger.error("settings", "D1 read failed, using defaults", err);
    return defaultSettings;
  }
});

// ---------------------------------------------------------------------------
// Public helpers (locale-resolved, empty values removed)
// ---------------------------------------------------------------------------

type PublicContact = {
  address: string;
  email: string;
  instagram: { handle: string; url: string } | null;
};

/** The club's contact channels for one locale; empty values are left out by the callers. */
export function publicContact(locale: Locale, contact: ContactInfo): PublicContact {
  return {
    address: pick(locale, contact.address, contact.addressEn),
    email: contact.email,
    instagram: contact.instagram
      ? { handle: `@${contact.instagram}`, url: instagramUrl(contact.instagram) }
      : null,
  };
}

/** https URLs only (external links typed by admins). */
export function safeExternalUrl(url: string): string | null {
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Own uploads (/media/...), bundled files (/brand/...) or https images. */
export function safeImageUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("..")) return url;
  return safeExternalUrl(url);
}

type PublicStat = { label: string; value: string };

/**
 * Stats in admin order. `members` counts active members in D1; `events` is the activity count of
 * the latest school year in the official report (impact_stats), falling back to the number of
 * published past activities when no report exists. An item without a value is left out.
 */
export async function getHomeStats(
  locale: Locale,
  s: SiteSettings,
  autoLabels: { members: string; events: string },
  { featuredOnly = false }: { featuredOnly?: boolean } = {},
): Promise<PublicStat[]> {
  const items = (featuredOnly ? s.stats.filter((i) => i.featured) : s.stats).slice(
    0,
    featuredOnly ? MAX_FEATURED_STATS : undefined,
  );
  if (items.length === 0) return [];
  const needs = new Set(items.map((i) => i.kind));
  const counts = { members: 0, events: 0 };
  try {
    const db = await getDb();
    if (needs.has("members")) {
      // Official report figure first; website accounts are not report members.
      const official = await getReportMembership();
      if (official?.active) counts.members = official.active;
      else {
        const [m] = await db
          .select({ n: count() })
          .from(members)
          .where(and(eq(members.active, true), eq(members.group, "member")));
        counts.members = m?.n ?? 0;
      }
    }
    if (needs.has("events")) counts.events = await getActivityCount();
  } catch (err) {
    logger.error("settings", "stats count failed", err);
  }
  return items
    .map((item) => {
      if (item.kind === "custom") {
        return { label: pick(locale, item.label, item.labelEn), value: item.value };
      }
      const n = counts[item.kind];
      return {
        label: pick(locale, item.label, item.labelEn) || autoLabels[item.kind],
        value: n > 0 ? formatNumber(n) : "",
      };
    })
    .filter((i) => i.label && i.value);
}

/** The one source for "activities organised": latest official report, else published activities. */
export async function getActivityCount(): Promise<number> {
  const impact = await getLatestImpact();
  if (impact?.total) return impact.total.activities;
  const db = await getDb();
  const [e] = await db
    .select({ n: count() })
    .from(events)
    .where(and(eq(events.published, true), lt(events.startsAt, new Date())));
  return e?.n ?? 0;
}

/** Splits admin text into paragraphs (blank line = new paragraph). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * The club's current school year («Одоогийн хичээлийн жил»): the admin's setting, else the year
 * of today (Ulaanbaatar). Public pages are cached, so a page shows the year of its last render.
 */
export async function getCurrentSchoolYear(): Promise<string> {
  const s = await getSiteSettings();
  return currentSchoolYear(s.schoolYear.current, nowMs());
}
