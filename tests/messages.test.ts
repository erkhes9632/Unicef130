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
  test("English strings contain no Cyrillic (except language names)", () => {
    for (const [k, v] of Object.entries(fen)) {
      if (k === "Locale.mn") continue;
      expect(/[Ѐ-ӿ]/.test(JSON.stringify(v)), k).toBe(false);
    }
  });
});
