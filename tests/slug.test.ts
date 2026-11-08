import { describe, expect, test } from "bun:test";
import { slugify, transliterate, uniqueSlug } from "@/lib/slug";

describe("slug", () => {
  test("transliterates Mongolian Cyrillic", () => {
    expect(transliterate("Хүүхдийн эрх")).toBe("khuukhdiin erkh");
    expect(transliterate("Өвөл, Үүр, Цэцэг, Шинэ, Чих, Юу, Яг, Ёс, Жил")).toBe(
      "uvul, uur, tsetseg, shine, chikh, yuu, yag, yos, jil",
    );
  });
  test("slugify produces URL-safe slugs", () => {
    expect(slugify("Дэлхийн хүүхдийн өдрийг хамтдаа тэмдэглэнэ")).toBe(
      "delkhiin-khuukhdiin-udriig-khamtdaa-temdeglene",
    );
    expect(slugify("«Дулаан өвөл» аян!")).toBe("dulaan-uvul-ayan");
    expect(slugify("  Шинэ жил 2027 🎉 ")).toBe("shine-jil-2027");
    expect(slugify("Café déjà vu")).toBe("cafe-deja-vu");
    expect(slugify("а".repeat(200)).length).toBeLessThanOrEqual(80);
    expect(slugify("!!!")).toBe("");
  });
  test("uniqueSlug appends a counter", async () => {
    const taken = new Set(["post", "post-2"]);
    expect(await uniqueSlug("post", async (s) => taken.has(s))).toBe("post-3");
    expect(await uniqueSlug("fresh", async (s) => taken.has(s))).toBe("fresh");
    expect(await uniqueSlug("", async () => false)).toBe("post");
  });
});
