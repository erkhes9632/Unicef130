/**
 * Builds the share images and the legacy favicon.ico from the club logo kit in public/brand/.
 * The logo files themselves are used as delivered (never redrawn or recoloured).
 *
 *   bun run brand:assets
 *
 * Inputs:   public/brand/logo-stacked-light-1200.png, public/brand/favicon-{32,48}.png
 * Outputs:  public/og-default.png (mn) and public/og-default-en.png (1200×630, warm light
 *           background, stacked logo + club name), public/favicon.ico (32 + 48 px PNGs inside)
 *
 * Rerun after replacing a logo file in public/brand/, then rebuild/deploy. The club name is set
 * in the system bold sans (sharp/Pango cannot read the site's woff2 fonts); it must render the
 * Mongolian letters Ө and Ү.
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp, { type OverlayOptions } from "sharp";

const BRAND = "public/brand";
const W = 1200;
const H = 630;
const C = {
  bg: "#FFFBF5",
  ink: "#1F2A37",
  muted: "#59606B",
  stripe: ["#1cabe2", "#8e4fc6", "#ffc94a", "#f2784b", "#4cb847"],
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const NAME = {
  mn: ["130-р сургуулийн", "UNICEF клуб"],
  en: ["School No. 130", "UNICEF Club"],
} as const;
const SITE = "130foreverychild.site";

/** One line of text as a transparent PNG (Pango markup). */
async function text(line: string, size: number, color: string, weight: "bold" | "normal") {
  const markup = `<span foreground="${color}">${esc(line)}</span>`;
  const font = `Helvetica Neue ${weight === "bold" ? "Bold" : ""} ${size}`;
  return sharp({ text: { text: markup, font, rgba: true, dpi: 72 } })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function ogImage(locale: "mn" | "en", file: string) {
  const logoH = 430;
  const logo = await sharp(`${BRAND}/logo-stacked-light-1200.png`)
    .resize({ height: logoH, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const left = 80;
  const textX = left + logo.info.width + 56;
  // Largest name size (≤ 68 px) that fits next to the logo.
  let size = 68;
  let l1 = await text(NAME[locale][0], size, C.ink, "bold");
  let l2 = await text(NAME[locale][1], size, C.ink, "bold");
  while (textX + Math.max(l1.info.width, l2.info.width) > W - 56 && size > 40) {
    size -= 2;
    [l1, l2] = await Promise.all([
      text(NAME[locale][0], size, C.ink, "bold"),
      text(NAME[locale][1], size, C.ink, "bold"),
    ]);
  }
  const site = await text(SITE, 28, C.muted, "normal");
  const blockH = l1.info.height + 10 + l2.info.height + 34 + site.info.height;
  let y = Math.round((H - 12 - blockH) / 2);
  const layers: OverlayOptions[] = [
    { input: logo.data, left, top: Math.round((H - 12 - logo.info.height) / 2) },
  ];
  for (const [part, gap] of [
    [l1, 10],
    [l2, 34],
    [site, 0],
  ] as const) {
    layers.push({ input: part.data, left: textX, top: y });
    y += part.info.height + gap;
  }
  const stripe = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="12">${C.stripe
      .map((c, i) => `<rect x="${i * (W / 5)}" width="${W / 5}" height="12" fill="${c}"/>`)
      .join("")}</svg>`,
  );
  layers.push({ input: stripe, left: 0, top: H - 12 });
  if (textX + Math.max(l1.info.width, l2.info.width) > W - 56)
    throw new Error(`${file}: the club name does not fit next to the logo`);
  await sharp({ create: { width: W, height: H, channels: 4, background: C.bg } })
    .composite(layers)
    .flatten({ background: C.bg })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

/** ICO container with embedded PNG images (supported by all current browsers). */
function ico(pngs: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

await ogImage("mn", "public/og-default.png");
await ogImage("en", "public/og-default-en.png");
// The kit's PNGs go into the .ico unchanged.
await writeFile(
  "public/favicon.ico",
  ico(
    await Promise.all(
      [32, 48].map(async (size) => ({
        size,
        data: await readFile(`${BRAND}/favicon-${size}.png`),
      })),
    ),
  ),
);
console.log("✅ public/og-default.png, public/og-default-en.png, public/favicon.ico written.");
