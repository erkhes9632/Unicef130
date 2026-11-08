import { cache } from "react";
import {
  fallbackContact,
  fallbackDonationUrl,
  fallbackSocials,
  fallbackStats,
  type ContactInfo,
  type SocialLink,
  type SocialPlatform,
} from "@/config/site";
import { getDb } from "@/db";
import { settings } from "@/db/schema";

export type SiteSettings = {
  contact: ContactInfo;
  socials: SocialLink[];
  stats: typeof fallbackStats;
  donationUrl: string;
};

export const socialPlatforms: SocialPlatform[] = [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "telegram",
  "x",
];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Site-wide settings from D1 (admin → Сайтын тохиргоо), merged over the fallbacks in
 * src/config/site.ts. If D1 is unavailable the fallbacks are used so the site never breaks.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  let rows: { key: string; value: unknown }[] = [];
  try {
    const db = await getDb();
    rows = await db.select().from(settings);
  } catch (err) {
    console.error("[settings] D1 read failed, using fallbacks", err);
  }
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const contact = isObject(map.get("contact"))
    ? { ...fallbackContact, ...(map.get("contact") as Partial<ContactInfo>) }
    : fallbackContact;
  const stats = isObject(map.get("stats"))
    ? { ...fallbackStats, ...(map.get("stats") as Partial<typeof fallbackStats>) }
    : fallbackStats;
  const storedSocials = Array.isArray(map.get("socials"))
    ? (map.get("socials") as SocialLink[])
    : fallbackSocials;
  const socials = socialPlatforms.map((platform) => ({
    platform,
    url: storedSocials.find((s) => s.platform === platform)?.url ?? "",
  }));
  const donation = map.get("donationUrl");

  return {
    contact,
    socials,
    stats,
    donationUrl: typeof donation === "string" ? donation : fallbackDonationUrl,
  };
});
