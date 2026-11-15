import { describe, expect, test } from "bun:test";
import { initials } from "@/lib/names";
import { withoutRepeatedLead } from "@/lib/rich-text/sanitize";
import { slugify, transliterate } from "@/lib/slug";

describe("Mongolian transliteration", () => {
  test("common letters", () => {
    expect(slugify("Волейболын тэмцээн")).toBe("voleibolyn-temtseen");
    expect(slugify("Хүүхдийн эрх")).toBe("khuukhdiin-erkh");
    expect(slugify("Өгөхийн жаргал")).toBe("ugukhiin-jargal");
    expect(slugify("Их сургуулийн зөвлөгчийг урив")).toBe("ikh-surguuliin-zuvlugchiig-uriv");
    expect(slugify("Шинэ жилийн хандив")).toBe("shine-jiliin-khandiv");
    expect(slugify("Цэцэг, Чулуу, Ямаа, Юм, Ёс")).toBe("tsetseg-chuluu-yamaa-yum-yos");
    expect(transliterate("ерөнхий")).toBe("erunkhii");
  });
});

describe("avatar initials use the given name", () => {
  test("patronymic initial is skipped", () => {
    expect(initials("Д.Цэцэг")).toBe("Ц");
    expect(initials("Б.Бат-Эрдэнэ")).toBe("БЭ");
    expect(initials("D. Tsetseg")).toBe("T");
    expect(initials("Ану")).toBe("А");
  });
});

describe("news body does not repeat the lead", () => {
  const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
  test("drops a paragraph equal to the lead, trims a paragraph starting with it", () => {
    expect(
      withoutRepeatedLead({ type: "doc", content: [p("Лид."), p("Үлдсэн.")] }, "Лид.").content,
    ).toEqual([p("Үлдсэн.")]);
    expect(
      withoutRepeatedLead({ type: "doc", content: [p("Лид. Дараа нь.")] }, "Лид.").content,
    ).toEqual([p("Дараа нь.")]);
    expect(withoutRepeatedLead({ type: "doc", content: [p("Өөр.")] }, "Лид.").content).toEqual([
      p("Өөр."),
    ]);
  });
});
