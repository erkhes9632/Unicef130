import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "@/components/common/rich-text";
import { safeHref, safeImageSrc } from "@/lib/rich-text/sanitize";
import { isEmptyDoc, richTextSchema } from "@/lib/validation/rich-text";

describe("rich text", () => {
  test("safeHref allow-list", () => {
    expect(safeHref("https://unicef.org")).toBe("https://unicef.org/");
    expect(safeHref("/news")).toBe("/news");
    expect(safeHref("mailto:a@b.mn")).toBe("mailto:a@b.mn");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeImageSrc("mailto:a@b.mn")).toBeNull();
  });
  test("renderer escapes text and drops unsafe links/attributes", () => {
    const html = renderToStaticMarkup(
      RichText({
        doc: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "x",
                  marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
                },
              ],
            },
            {
              type: "paragraph",
              attrs: { onclick: "alert(1)", style: "x" },
              content: [{ type: "text", text: "y" }],
            },
            {
              type: "iframe",
              attrs: { src: "https://evil.example" },
              content: [{ type: "text", text: "z" }],
            },
            { type: "image", attrs: { src: "javascript:alert(1)" } },
          ],
        },
      })!,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<img");
  });
  test("schema limits depth and size", () => {
    let node: { type: string; content?: unknown[] } = { type: "paragraph" };
    for (let i = 0; i < 20; i++) node = { type: "blockquote", content: [node] };
    expect(richTextSchema.safeParse({ type: "doc", content: [node] }).success).toBe(false);
    expect(
      richTextSchema.safeParse({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "a".repeat(20_001) }] }],
      }).success,
    ).toBe(false);
    expect(richTextSchema.safeParse({ type: "not-doc" }).success).toBe(false);
  });
  test("isEmptyDoc", () => {
    expect(isEmptyDoc({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(
      isEmptyDoc({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: " " }] }],
      }),
    ).toBe(true);
    expect(
      isEmptyDoc({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }],
      }),
    ).toBe(false);
  });
});
