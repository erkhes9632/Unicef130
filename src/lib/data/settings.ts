import {
  fallbackContact,
  fallbackDonationUrl,
  fallbackSocials,
  fallbackStats,
  type ContactInfo,
  type SocialLink,
} from "@/config/site";

export type SiteSettings = {
  contact: ContactInfo;
  socials: SocialLink[];
  stats: typeof fallbackStats;
  donationUrl: string;
};

/**
 * Site-wide settings (contact info, socials, homepage stats, donation link).
 * Phase 5 replaces the body with a D1 read (admin → Site settings) that falls back to these values.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  return {
    contact: fallbackContact,
    socials: fallbackSocials,
    stats: fallbackStats,
    donationUrl: fallbackDonationUrl,
  };
}
