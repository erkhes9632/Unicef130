/**
 * URL slugs with Mongolian Cyrillic → Latin transliteration (close to the common MNS 5217 style,
 * e.g. "Хүүхдийн эрх" → "khuukhdiin-erkh").
 */
const map: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "ye",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  ө: "u",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ү: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "y",
  ь: "i",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function transliterate(input: string) {
  return Array.from(input.toLocaleLowerCase("mn"), (ch) => map[ch] ?? ch).join("");
}

export const SLUG_MAX = 80;
export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string) {
  const slug = transliterate(input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
  return slug;
}

/** Returns `base`, or `base-2`, `base-3`… — the first one `isTaken` says is free. */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>) {
  const root = base || "post";
  if (!(await isTaken(root))) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root.slice(0, SLUG_MAX - String(i).length - 1)}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${root.slice(0, 60)}-${crypto.randomUUID().slice(0, 8)}`;
}
