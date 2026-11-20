/** Small pure helpers that guard data and output: audit diffs, form parsing, safe URLs, SEO. */
import { describe, expect, mock, test } from "bun:test";

// The modules below import the DB / Cloudflare context; none is touched by these helpers.
mock.module("@/db", () => ({ getDb: async () => ({}) }));
mock.module("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: {} }) }));

const { diffFields, shortId } = await import("@/lib/admin/audit-diff");
const { fd, actionError, validationError } = await import("@/lib/admin/action-state");
const { AuthError } = await import("@/lib/auth/session");
const { displayClassName, pick } = await import("@/lib/data/localize");
const { paragraphs, safeExternalUrl, safeImageUrl, safeMapUrl } =
  await import("@/lib/data/settings");
const { jsonLd, localizedPath } = await import("@/lib/seo");
const { eventSchoolYear } = await import("@/lib/members/hours");
const { z } = await import("zod");

describe("audit diff", () => {
  test("lists only changed fields, shortens long text, compares dates by time", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    const before = { title: "A", body: "x".repeat(200), at: d, n: 1, tags: ["a"] };
    const after = { title: "B", body: "y".repeat(200), at: new Date(d), n: 1, tags: ["a", "b"] };
    const out = diffFields(before, after, ["title", "body", "at", "n", "tags"])!;
    expect(Object.keys(out).sort()).toEqual(["body", "tags", "title"]);
    expect(out.title).toEqual(["A", "B"]);
    expect(String(out.body![0]).length).toBe(78); // 77 chars + "…"
    expect(out.tags).toEqual(["…", "…"]);
  });
  test("fields missing from the update are ignored; no change → undefined", () => {
    expect(diffFields({ a: 1, b: 2 }, { a: 1 }, ["a", "b"])).toBeUndefined();
    expect(diffFields({ a: null }, { a: undefined }, ["a"])).toBeUndefined();
  });
  test("personal fields are logged as changed without their values (no names in the audit log)", () => {
    const out = diffFields(
      { name: "Бат", className: "9А", active: true },
      { name: "Болд", className: "10А", active: false },
      ["name", "className", "active"],
      ["name", "className"],
    )!;
    expect(out).toEqual({ name: ["…", "…"], className: ["…", "…"], active: [true, false] });
    expect(JSON.stringify(out)).not.toContain("Бат");
  });
  test("short ids never carry more than 8 characters", () => {
    expect(shortId("0123456789abcdef")).toBe("01234567");
  });
});

describe("FormData helpers", () => {
  const data = new FormData();
  data.set("s", "  hi  ");
  data.set("e", "   ");
  data.set("b1", "on");
  data.set("b2", "false");
  data.set("i", "42x");
  data.set("bad", "abc");
  data.set("j", '{"a":1}');
  data.set("jbad", "{oops");
  data.set("file", new File(["x"], "x.txt"));
  test("strings are trimmed; non-strings read as empty", () => {
    expect(fd.str(data, "s")).toBe("hi");
    expect(fd.str(data, "file")).toBe("");
    expect(fd.opt(data, "e")).toBeNull();
    expect(fd.opt(data, "missing")).toBeNull();
  });
  test("booleans, integers with fallback, JSON (null when empty, undefined when broken)", () => {
    expect(fd.bool(data, "b1")).toBe(true);
    expect(fd.bool(data, "b2")).toBe(false);
    expect(fd.int(data, "i")).toBe(42);
    expect(fd.int(data, "bad", 7)).toBe(7);
    expect(fd.json(data, "j")).toEqual({ a: 1 });
    expect(fd.json(data, "missing")).toBeNull();
    expect(fd.json(data, "jbad")).toBeUndefined();
  });
});

describe("admin action errors", () => {
  test("auth errors become polite messages; validation errors list fields", () => {
    expect(actionError(new AuthError("forbidden")).message).toContain("эрх байхгүй");
    expect(actionError(new AuthError("unauthenticated")).message).toContain("нэвтэрнэ");
    const r = z.object({ title: z.string().min(1) }).safeParse({ title: "" });
    expect(validationError(r.error!).fieldErrors?.title?.length).toBe(1);
  });
  test("Next.js redirect / notFound signals pass through", () => {
    const redirect = Object.assign(new Error("r"), { digest: "NEXT_REDIRECT;replace;/x;307;" });
    expect(() => actionError(redirect)).toThrow();
    const nf = Object.assign(new Error("nf"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    expect(() => actionError(nf)).toThrow();
  });
  test("unknown errors are logged and hidden from the user", () => {
    const spy = mock(() => {});
    const orig = console.error;
    console.error = spy;
    try {
      expect(actionError(new Error("db exploded")).message).toBe(
        "Алдаа гарлаа. Дахин оролдоно уу.",
      );
      expect(spy).toHaveBeenCalled();
    } finally {
      console.error = orig;
    }
  });
});

describe("localisation helpers", () => {
  test("pick falls back to Mongolian when English is empty", () => {
    expect(pick("en", "Мод", "Tree")).toBe("Tree");
    expect(pick("en", "Мод", "")).toBe("Мод");
    expect(pick("en", "Мод", null)).toBe("Мод");
    expect(pick("mn", "Мод", "Tree")).toBe("Мод");
  });
  test("class names are transliterated for English only", () => {
    expect(displayClassName("mn", "10А")).toBe("10А");
    expect(displayClassName("en", "10А")).toBe("10A");
    expect(displayClassName("en", "11Ө")).toBe("11U");
    expect(displayClassName("en", "багш")).toBe("Teacher");
  });
});

describe("safe URLs from admin input", () => {
  test("external links: https only", () => {
    expect(safeExternalUrl("https://facebook.com/x")).toBe("https://facebook.com/x");
    expect(safeExternalUrl("http://facebook.com/x")).toBeNull();
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
  });
  test("images: own paths or https, never protocol-relative or path traversal", () => {
    expect(safeImageUrl("/media/a.webp")).toBe("/media/a.webp");
    expect(safeImageUrl("//evil.example/a.png")).toBeNull();
    expect(safeImageUrl("/media/../secret")).toBeNull();
    expect(safeImageUrl("data:image/png;base64,AAAA")).toBeNull();
    expect(safeImageUrl("")).toBeNull();
  });
  test("map embed: coordinates or a Google Maps embed URL only", () => {
    const base = { mapLat: "", mapLng: "", mapEmbedUrl: "" };
    const c = (x: Partial<typeof base>) =>
      ({ ...base, ...x }) as unknown as Parameters<typeof safeMapUrl>[0];
    expect(safeMapUrl(c({ mapLat: "47.9", mapLng: "106.9" }))).toContain("q=47.9,106.9");
    expect(safeMapUrl(c({ mapLat: "95", mapLng: "106.9" }))).toBeNull();
    expect(safeMapUrl(c({ mapEmbedUrl: "https://www.google.com/maps/embed?pb=1" }))).toBe(
      "https://www.google.com/maps/embed?pb=1",
    );
    expect(safeMapUrl(c({ mapEmbedUrl: "https://evil.example/maps/embed" }))).toBeNull();
  });
  test("paragraphs split on blank lines and drop empties", () => {
    expect(paragraphs("a\nb\n\n  \n\nc ")).toEqual(["a\nb", "c"]);
    expect(paragraphs("")).toEqual([]);
  });
});

describe("SEO helpers", () => {
  test("JSON-LD cannot close the script tag", () => {
    const html = jsonLd({ name: "</script><script>alert(1)</script>" }).__html;
    expect(html).not.toContain("</script>");
    expect(JSON.parse(html).name).toBe("</script><script>alert(1)</script>");
  });
  test("localized paths: Mongolian has no prefix", () => {
    expect(localizedPath("mn", "/")).toBe("/");
    expect(localizedPath("mn", "/news")).toBe("/news");
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("en", "/news")).toBe("/en/news");
  });
});

test("an event's hours count towards its own school year, else by date", () => {
  expect(eventSchoolYear({ schoolYear: "2025-2026", startsAt: new Date("2026-10-01") })).toBe(
    "2025-2026",
  );
  expect(eventSchoolYear({ schoolYear: null, startsAt: new Date("2026-10-01T12:00:00Z") })).toBe(
    "2026-2027",
  );
});
