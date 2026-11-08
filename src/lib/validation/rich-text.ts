import { z } from "zod";
import type { RichTextDoc, RichTextNode } from "@/lib/types";

const MAX_JSON_BYTES = 200_000;
const MAX_DEPTH = 12;

const nodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.string().max(40),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(nodeSchema).max(2000).optional(),
    marks: z
      .array(
        z.object({ type: z.string().max(40), attrs: z.record(z.string(), z.unknown()).optional() }),
      )
      .max(20)
      .optional(),
    text: z.string().max(20_000).optional(),
  }),
);

function depth(node: RichTextNode, d = 0): number {
  return Math.max(d, ...(node.content ?? []).map((c) => depth(c, d + 1)));
}

/** Validates Tiptap JSON coming from the admin editor (size + depth limited). */
export const richTextSchema = z
  .object({ type: z.literal("doc"), content: z.array(nodeSchema).max(2000).optional() })
  .refine((doc) => JSON.stringify(doc).length <= MAX_JSON_BYTES, {
    error: "Агуулга хэт урт байна.",
  })
  .refine((doc) => (doc.content ?? []).every((n) => depth(n) <= MAX_DEPTH), {
    error: "Агуулгын бүтэц хэт гүн байна.",
  }) as z.ZodType<RichTextDoc>;

export const emptyDoc: RichTextDoc = { type: "doc", content: [{ type: "paragraph" }] };

/** True when the document has no visible text or images. */
export function isEmptyDoc(doc: RichTextDoc | null | undefined) {
  const walk = (n: RichTextNode): boolean =>
    Boolean(n.text?.trim()) || n.type === "image" || (n.content ?? []).some(walk);
  return !doc || !(doc.content ?? []).some(walk);
}
