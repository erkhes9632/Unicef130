import type { Locale } from "@/i18n/routing";
import { mockMembers } from "@/lib/mock/members";
import type { Member } from "@/lib/types";
import { pick } from "./localize";

export type MemberItem = {
  id: string;
  name: string;
  role: string;
  className: string;
  /** Already filtered by the `showPhoto` consent flag. */
  photoUrl: string | null;
};

function toItem(locale: Locale, m: Member): MemberItem {
  return {
    id: m.id,
    name: pick(locale, m.name, m.nameEn),
    role: pick(locale, m.role, m.roleEn),
    className: m.className,
    photoUrl: m.showPhoto ? m.photoUrl : null,
  };
}

// Phase 5: replace with D1 queries (Drizzle). Keep the signature.
export async function listMembers(locale: Locale) {
  const sorted = [...mockMembers].sort((a, b) => a.order - b.order);
  return {
    leadership: sorted.filter((m) => m.group === "leadership").map((m) => toItem(locale, m)),
    members: sorted.filter((m) => m.group === "member").map((m) => toItem(locale, m)),
  };
}
