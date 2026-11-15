import { describe, expect, test } from "bun:test";
import en from "../messages/en.json";
import mn from "../messages/mn.json";

type Tree = { [k: string]: string | string[] | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string | string[]> {
  return Object.entries(tree).reduce<Record<string, string | string[]>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string" || Array.isArray(v)) acc[key] = v;
    else Object.assign(acc, flatten(v, key));
    return acc;
  }, {});
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();

describe("messages", () => {
  const fmn = flatten(mn as Tree);
  const fen = flatten(en as Tree);

  test("mn and en have exactly the same keys", () => {
    expect(Object.keys(fen).sort()).toEqual(Object.keys(fmn).sort());
  });
  test("no empty strings, arrays have the same length", () => {
    for (const [k, v] of Object.entries(fmn)) {
      const e = fen[k]!;
      if (Array.isArray(v)) expect(Array.isArray(e) && e.length === v.length).toBe(true);
      else {
        expect(v.trim().length, `mn ${k}`).toBeGreaterThan(0);
        expect(String(e).trim().length, `en ${k}`).toBeGreaterThan(0);
      }
    }
  });
  test("ICU placeholders match between locales", () => {
    for (const [k, v] of Object.entries(fmn)) {
      if (typeof v === "string") expect(placeholders(String(fen[k])), k).toEqual(placeholders(v));
    }
  });
  test("English strings contain no Cyrillic (except language names and name examples)", () => {
    // Applicants must write their name in Cyrillic, so the English hint shows a Cyrillic example.
    const allowed = new Set([
      "Locale.mn",
      "Forms.fullNamePlaceholder",
      "Forms.errors.nameCyrillic",
    ]);
    for (const [k, v] of Object.entries(fen)) {
      if (allowed.has(k)) continue;
      expect(/[Ѐ-ӿ]/.test(JSON.stringify(v)), k).toBe(false);
    }
  });
});

describe("client message namespaces", () => {
  test("every namespace read by a client component is sent to the browser", async () => {
    const { clientNamespaces } = await import("@/i18n/client-namespaces");
    const { Glob } = await import("bun");
    const used = new Set<string>();
    for await (const file of new Glob("src/**/*.tsx").scan(".")) {
      const src = await Bun.file(file).text();
      if (!/^["']use client["']/m.test(src)) continue;
      for (const m of src.matchAll(/useTranslations\(\s*["'](\w+)/g)) used.add(m[1]!);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const ns of used) expect(clientNamespaces as readonly string[]).toContain(ns);
  });
});
