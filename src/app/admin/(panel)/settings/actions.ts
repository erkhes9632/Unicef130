"use server";

import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { actionError, fd, validationError, type ActionState } from "@/lib/admin/action-state";
import { revalidatePublic } from "@/lib/admin/revalidate";
import { requireRole } from "@/lib/auth/session";
import { socialPlatforms } from "@/lib/data/settings";
import { settingsInputSchema } from "@/lib/validation/admin";

export async function saveSettings(_prev: ActionState, data: FormData): Promise<ActionState> {
  try {
    const user = await requireRole("admin");
    const parsed = settingsInputSchema.safeParse({
      contact: {
        address: fd.str(data, "contact.address"),
        email: fd.str(data, "contact.email"),
        phone: fd.str(data, "contact.phone"),
        officeHours: fd.str(data, "contact.officeHours"),
        mapEmbedUrl: fd.str(data, "contact.mapEmbedUrl"),
      },
      socials: socialPlatforms.map((platform) => ({
        platform,
        url: fd.str(data, `socials.${platform}`),
      })),
      stats: {
        members: fd.int(data, "stats.members"),
        events: fd.int(data, "stats.events"),
        volunteerHours: fd.int(data, "stats.volunteerHours"),
        childrenHelped: fd.int(data, "stats.childrenHelped"),
      },
      donationUrl: fd.str(data, "donationUrl"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const db = await getDb();
    const entries = Object.entries(parsed.data).map(([key, value]) => ({ key, value }));
    await db
      .insert(settings)
      .values(entries)
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: sql`excluded.value`, updatedAt: new Date() },
      });
    await logActivity(user, "settings.update", {
      type: "settings",
      summary: "Сайтын тохиргоог шинэчлэв",
    });
    revalidatePublic();
    return { ok: true, message: "Тохиргоо хадгалагдлаа." };
  } catch (err) {
    return actionError(err);
  }
}
