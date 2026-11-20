/** Server-side metadata removal for uploads (EXIF/GPS must never reach R2). */
import { describe, expect, test } from "bun:test";
import { sniffImageType } from "@/lib/media/server";
import { stripImageMetadata } from "@/lib/media/strip-metadata";

const enc = (s: string) => new TextEncoder().encode(s);
const cat = (...parts: (Uint8Array | number[])[]) =>
  Uint8Array.from(parts.flatMap((p) => Array.from(p)));
const has = (hay: Uint8Array, needle: string) =>
  Buffer.from(hay).includes(Buffer.from(needle, "latin1"));

describe("stripImageMetadata", () => {
  test("JPEG: APP1 (Exif with GPS) and APP13 removed, JFIF + scan data kept", () => {
    const seg = (marker: number, body: Uint8Array) => {
      const len = body.length + 2;
      return cat([0xff, marker, len >> 8, len & 0xff], body);
    };
    const jpeg = cat(
      [0xff, 0xd8],
      seg(0xe0, enc("JFIF\0")),
      seg(0xe1, enc("Exif\0\0GPSLatitude 47.9")),
      seg(0xed, enc("Photoshop 3.0 IPTC")),
      seg(0xdb, enc("quant")),
      [0xff, 0xda, 0, 4, 1, 2],
      enc("compressed-image-data"),
      [0xff, 0xd9],
    );
    const out = stripImageMetadata(jpeg, "image/jpeg");
    expect(has(out, "GPSLatitude")).toBe(false);
    expect(has(out, "IPTC")).toBe(false);
    expect(has(out, "JFIF")).toBe(true);
    expect(has(out, "compressed-image-data")).toBe(true);
    expect(sniffImageType(out)).toBe("image/jpeg");
  });

  test("PNG: eXIf / tEXt chunks removed, image chunks kept", () => {
    const chunk = (type: string, body: Uint8Array) =>
      cat(
        [0, 0, 0, body.length].map((n, i) => (i === 3 ? body.length & 0xff : n)),
        enc(type),
        body,
        [0, 0, 0, 0],
      );
    const png = cat(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      chunk("IHDR", new Uint8Array(13)),
      chunk("eXIf", enc("GPS 47.9 106.9")),
      chunk("tEXt", enc("Author\0child name")),
      chunk("IDAT", enc("pixels")),
      chunk("IEND", new Uint8Array(0)),
    );
    const out = stripImageMetadata(png, "image/png");
    expect(has(out, "GPS")).toBe(false);
    expect(has(out, "child name")).toBe(false);
    expect(has(out, "IDAT")).toBe(true);
    expect(has(out, "IEND")).toBe(true);
    expect(sniffImageType(out)).toBe("image/png");
  });

  test("WebP: EXIF/XMP chunks removed, VP8X flags cleared, RIFF size fixed", () => {
    const le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
    const chunk = (type: string, body: Uint8Array) =>
      cat(enc(type), le(body.length), body, body.length % 2 ? [0] : []);
    const vp8x = new Uint8Array(10);
    vp8x[0] = 0b0000_1100; // EXIF + XMP present
    const body = cat(
      enc("WEBP"),
      chunk("VP8X", vp8x),
      chunk("VP8 ", enc("frame")),
      chunk("EXIF", enc("GPS 47.9")),
      chunk("XMP ", enc("<x:xmpmeta/>")),
    );
    const webp = cat(enc("RIFF"), le(body.length), body);
    const out = stripImageMetadata(webp, "image/webp");
    expect(has(out, "GPS")).toBe(false);
    expect(has(out, "xmpmeta")).toBe(false);
    expect(has(out, "frame")).toBe(true);
    expect(out[20]! & 0b1100).toBe(0);
    const riffSize = out[4]! | (out[5]! << 8) | (out[6]! << 16) | (out[7]! << 24);
    expect(riffSize).toBe(out.length - 8);
    expect(sniffImageType(out)).toBe("image/webp");
  });

  test("malformed input is returned unchanged", () => {
    const junk = cat([0xff, 0xd8], [0x00, 0x01, 0x02]);
    expect(stripImageMetadata(junk, "image/jpeg")).toEqual(junk);
  });
});
