import "server-only";
import type { Locale } from "@/i18n/routing";
import { listFaqs } from "./faq";
import { listAlbums } from "./gallery";
import { pick } from "./localize";
import { getSiteSettings } from "./settings";

/** Case-insensitive "contains" on any of the texts (Cyrillic folds in JS, not in SQLite). */
export function textMatches(query: string, ...texts: (string | null | undefined)[]) {
  const q = query.toLocaleLowerCase();
  return texts.some((t) => !!t && t.toLocaleLowerCase().includes(q));
}

/** A short piece of `text` around the first match (for result snippets). */
export function snippet(text: string, query: string, size = 160) {
  const i = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (i < 0 || text.length <= size) return text.slice(0, size);
  const start = Math.max(0, i - Math.floor(size / 3));
  return `${start > 0 ? "…" : ""}${text.slice(start, start + size).trim()}…`;
}

/** Albums, published FAQ and the About page text matching the query (all small). */
export async function searchOtherContent(locale: Locale, query: string) {
  const [albums, faqs, settings] = await Promise.all([
    listAlbums(locale),
    listFaqs(locale),
    getSiteSettings(),
  ]);
  const a = settings.about;
  const aboutTexts = [
    pick(locale, a.intro, a.introEn),
    pick(locale, a.mission, a.missionEn),
    ...(a.historyPublished ? [pick(locale, a.history, a.historyEn)] : []),
    ...a.values.flatMap((v) => [pick(locale, v.title, v.titleEn), pick(locale, v.body, v.bodyEn)]),
  ].filter(Boolean);
  const aboutHit = aboutTexts.find((t) => textMatches(query, t));
  return {
    albums: albums.filter((x) => textMatches(query, x.title, x.description)).slice(0, 12),
    faqs: faqs.filter((f) => textMatches(query, f.question, f.answer)).slice(0, 10),
    about: aboutHit ? snippet(aboutHit, query) : null,
  };
}
