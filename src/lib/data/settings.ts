import "server-only";
import { and, count, eq, lt } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { events, members, settings } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/dates/format";
import {
  defaultSettings,
  parseSettings,
  type ContactInfo,
  type SiteSettings,
} from "@/lib/settings/types";
import { pick } from "./localize";

export type { SiteSettings } from "@/lib/settings/types";

/** Obvious sample values that must never reach the public site. */
function isPlaceholder(value: string) {
  return /@example\.(com|org|mn)$/i.test(value) || /0000\s?0000/.test(value);
}

function sanitizeContact(c: ContactInfo): ContactInfo {
  return {
    ...c,
    email: isPlaceholder(c.email) ? "" : c.email,
    phone: isPlaceholder(c.phone) ? "" : c.phone,
  };
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
    console.error("[settings] D1 read failed, using defaults", err);
    return defaultSettings;
  }
});

// ---------------------------------------------------------------------------
// Public helpers (locale-resolved, empty values removed)
// ---------------------------------------------------------------------------

export type PublicContact = {
  address: string;
  email: string;
  phone: string;
  officeHours: string;
  mapUrl: string | null;
};

/** Only Google Maps embeds are allowed in the iframe. */
export function safeMapUrl(contact: ContactInfo): string | null {
  const lat = Number.parseFloat(contact.mapLat);
  const lng = Number.parseFloat(contact.mapLng);
  if (
    contact.mapLat &&
    contact.mapLng &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  ) {
    return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  }
  try {
    const u = new URL(contact.mapEmbedUrl);
    return u.protocol === "https:" &&
      u.hostname === "www.google.com" &&
      u.pathname.startsWith("/maps/embed")
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

export function publicContact(locale: Locale, contact: ContactInfo): PublicContact {
  return {
    address: pick(locale, contact.address, contact.addressEn),
    email: contact.email,
    phone: contact.phone,
    officeHours: pick(locale, contact.officeHours, contact.officeHoursEn),
    mapUrl: safeMapUrl(contact),
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

/** Own uploads (/media/...), bundled files (/logos/...) or https images. */
export function safeImageUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("..")) return url;
  return safeExternalUrl(url);
}

export type PublicStat = { label: string; value: string };

/**
 * Home page stats in admin order. Auto items count rows in D1; an item with no value (or a
 * count of 0) is left out, and an empty list hides the stats band.
 */
export async function getHomeStats(
  locale: Locale,
  s: SiteSettings,
  autoLabels: { members: string; events: string },
): Promise<PublicStat[]> {
  if (s.stats.length === 0) return [];
  const needs = new Set(s.stats.map((i) => i.kind));
  const counts = { members: 0, events: 0 };
  try {
    const db = await getDb();
    const [m, e] = await Promise.all([
      needs.has("members")
        ? db.select({ n: count() }).from(members).where(eq(members.active, true))
        : Promise.resolve([{ n: 0 }]),
      needs.has("events")
        ? db
            .select({ n: count() })
            .from(events)
            .where(and(eq(events.published, true), lt(events.startsAt, new Date())))
        : Promise.resolve([{ n: 0 }]),
    ]);
    counts.members = m[0]?.n ?? 0;
    counts.events = e[0]?.n ?? 0;
  } catch (err) {
    console.error("[settings] stats count failed", err);
  }
  return s.stats
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

/** Splits admin text into paragraphs (blank line = new paragraph). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
