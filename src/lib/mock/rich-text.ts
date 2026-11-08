import type { RichTextDoc, RichTextNode } from "@/lib/types";

/** Tiny builders for Tiptap JSON used by mock + seed content. */
export const p = (...parts: (string | RichTextNode)[]): RichTextNode => ({
  type: "paragraph",
  content: parts.map((part) => (typeof part === "string" ? { type: "text", text: part } : part)),
});
export const h = (level: 2 | 3, text: string): RichTextNode => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});
export const b = (text: string): RichTextNode => ({
  type: "text",
  text,
  marks: [{ type: "bold" }],
});
export const ul = (...items: string[]): RichTextNode => ({
  type: "bulletList",
  content: items.map((text) => ({ type: "listItem", content: [p(text)] })),
});
export const quote = (text: string): RichTextNode => ({ type: "blockquote", content: [p(text)] });
export const doc = (...content: RichTextNode[]): RichTextDoc => ({ type: "doc", content });
