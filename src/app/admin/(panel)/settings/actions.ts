"use server";

import { inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { diffFields, logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { assertAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { deleteMediaUrls, isOwnMediaUrl } from "@/lib/media/server";
import { SETTINGS_KEYS, socialPlatforms, type SiteSettings } from "@/lib/settings/types";
import { aboutInputSchema, settingsInputSchema } from "@/lib/validation/admin";

/** JSON list from a hidden input: empty → [], malformed → left invalid so zod rejects it. */
function jsonList(data: FormData, key: string): unknown {
  const v = fd.json(data, key);
  return v === null ? [] : v;
}

async function upsert(entries: { key: string; value: unknown }[]) {
  const db = await getDb();
  await db
    .insert(settings)
    .values(entries)
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: sql`excluded.value`, updatedAt: new Date() },
    });
}

/** Site images (logos, hero, partner logos) that are no longer referenced after a save. */
function removedSiteImages(
  before: SiteSettings,
  after: Pick<SiteSettings, "branding" | "partners">,
) {
  const urls = (s: Pick<SiteSettings, "branding" | "partners">) => [
    s.branding.schoolLogoUrl,
    s.branding.unicefLogoUrl,
    s.branding.heroImageUrl,
    s.branding.ogImageUrl,
    ...s.partners.map((p) => p.logoUrl),
  ];
  const kept = new Set(urls(after));
  return urls(before).filter((u) => u && !kept.has(u) && isOwnMediaUrl(u, "site"));
}

export async function saveSettings(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const year = fd.str(data, "club.foundedYear");
    const parsed = settingsInputSchema.safeParse({
      announcement: {
        enabled: fd.bool(data, "announcement.enabled"),
        text: fd.str(data, "announcement.text"),
        textEn: fd.str(data, "announcement.textEn"),
        href: fd.str(data, "announcement.href"),
      },
      membership: {
        rejectedRetentionDays: fd.int(data, "membership.rejectedRetentionDays", 90),
        activeMemberHours:
          fd.str(data, "membership.activeMemberHours") === ""
            ? null
            : Number(fd.str(data, "membership.activeMemberHours")),
      },
      club: {
        name: fd.str(data, "club.name"),
        nameEn: fd.str(data, "club.nameEn"),
        shortName: fd.str(data, "club.shortName"),
        shortNameEn: fd.str(data, "club.shortNameEn"),
        description: fd.str(data, "club.description"),
        descriptionEn: fd.str(data, "club.descriptionEn"),
        foundedYear: year === "" ? null : Number(year),
      },
      branding: {
        schoolLogoUrl: fd.str(data, "branding.schoolLogoUrl"),
        unicefLogoUrl: fd.str(data, "branding.unicefLogoUrl"),
        heroImageUrl: fd.str(data, "branding.heroImageUrl"),
        heroImageAlt: fd.str(data, "branding.heroImageAlt"),
        heroImageAltEn: fd.str(data, "branding.heroImageAltEn"),
        ogImageUrl: fd.str(data, "branding.ogImageUrl"),
      },
      contact: {
        address: fd.str(data, "contact.address"),
        addressEn: fd.str(data, "contact.addressEn"),
        email: fd.str(data, "contact.email"),
        phone: fd.str(data, "contact.phone"),
        officeHours: fd.str(data, "contact.officeHours"),
        officeHoursEn: fd.str(data, "contact.officeHoursEn"),
        mapEmbedUrl: fd.str(data, "contact.mapEmbedUrl"),
        mapLat: fd.str(data, "contact.mapLat"),
        mapLng: fd.str(data, "contact.mapLng"),
      },
      socials: socialPlatforms
        .map((platform) => ({ platform, url: fd.str(data, `socials.${platform}`) }))
        .filter((s) => s.url),
      stats: jsonList(data, "stats"),
      partners: jsonList(data, "partners"),
      donation: {
        url: fd.str(data, "donation.url"),
        text: fd.str(data, "donation.text"),
        textEn: fd.str(data, "donation.textEn"),
      },
      helpOptions: jsonList(data, "helpOptions"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const before = await getSiteSettings();
    await upsert(
      (Object.keys(parsed.data) as (keyof typeof parsed.data)[]).map((k) => ({
        key: SETTINGS_KEYS[k],
        value: parsed.data[k],
      })),
    );
    // The old single donation link was replaced by `donation`.
    await (await getDb()).delete(settings).where(inArray(settings.key, ["donationUrl"]));
    await deleteMediaUrls(removedSiteImages(before, parsed.data));

    const changed = diffFields(
      before,
      parsed.data,
      Object.keys(parsed.data) as (keyof typeof parsed.data)[],
    );
    await logActivity(user, "settings.update", {
      type: "settings",
      summary: changed
        ? `Сайтын тохиргоог шинэчлэв: ${Object.keys(changed).join(", ")}`
        : "Сайтын тохиргоог хадгалав (өөрчлөлтгүй)",
      changes: changed,
    });
    revalidatePublic();
    return { ok: true, message: "Тохиргоо хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}

export async function saveAboutPage(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await assertAdmin();
    const parsed = aboutInputSchema.safeParse({
      intro: fd.str(data, "intro"),
      introEn: fd.str(data, "introEn"),
      history: fd.str(data, "history"),
      historyEn: fd.str(data, "historyEn"),
      historyPublished: fd.bool(data, "historyPublished"),
      mission: fd.str(data, "mission"),
      missionEn: fd.str(data, "missionEn"),
      values: jsonList(data, "values"),
    });
    if (!parsed.success) return validationError(parsed.error);

    await upsert([{ key: SETTINGS_KEYS.about, value: parsed.data }]);
    await logActivity(user, "settings.update", {
      type: "settings",
      summary: "«Бидний тухай» хуудсыг шинэчлэв",
    });
    revalidatePublic();
    return { ok: true, message: "Хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
