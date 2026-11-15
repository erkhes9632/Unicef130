import type { RichTextDoc, RichTextNode } from "@/lib/types";
/** URL allow-list for links/images inside rich text (blocks javascript:, data:, etc.). */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeImageSrc(value: unknown): string | null {
  const href = safeHref(value);
  if (!href) return null;
  return href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")
    ? href
    : null;
}

/** Plain text of a rich-text tree (for excerpts, search, meta descriptions). */
export function richTextToPlain(
  node: { text?: string; content?: unknown[] } | null | undefined,
): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  return (node.content ?? [])
    .map((child) => richTextToPlain(child as { text?: string; content?: unknown[] }))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const plain = (n: RichTextNode): string => n.text ?? (n.content ?? []).map(plain).join("");
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Drops the first paragraph when it repeats the lead (excerpt) shown in the article header,
 * or keeps only what follows the repeated lead sentence.
 */
export function withoutRepeatedLead(doc: RichTextDoc, lead: string): RichTextDoc {
  const [first, ...rest] = doc.content ?? [];
  const l = norm(lead);
  if (!first || first.type !== "paragraph" || !l) return doc;
  const text = norm(plain(first));
  if (text === l) return { ...doc, content: rest };
  if (text.startsWith(l) && (first.content ?? []).length === 1 && first.content![0]!.text) {
    const remainder = norm(text.slice(l.length));
    return {
      ...doc,
      content: remainder
        ? [{ ...first, content: [{ ...first.content![0]!, text: remainder }] }, ...rest]
        : rest,
    };
  }
  return doc;
}
