/**
 * Regenerates the share image and app icons from the logo files in public/logos/.
 *
 *   bun run brand:assets
 *
 * Inputs (optional):  public/logos/school-130.png, public/logos/unicef.png
 * Outputs:            public/og-default.png (1200×630), src/app/icon.png (512×512),
 *                     src/app/apple-icon.png (180×180), src/app/favicon.ico (16/32/48)
 *
 * Without the school logo a "130" text badge is used (logos are never drawn). Rerun after
 * adding or replacing a logo, then rebuild/deploy.
 */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import sharp, { type OverlayOptions } from "sharp";

const SCHOOL = "public/logos/school-130.png";
const UNICEF = "public/logos/unicef.png";

const C = {
  cyan: "#1cabe2",
  purple: "#8e4fc6",
  green: "#4cb847",
  blue: "#2f7ed8",
  gold: "#f5b301",
  night: "#0b1220",
  paper: "#ffffff",
};
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Logo resized to fit a box (keeps aspect ratio and transparency). */
async function logoFit(path: string, w: number, h: number) {
  return sharp(path)
    .resize(w, h, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
}

function monogramSvg(size: number, bg = C.cyan) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${bg}"/>
      <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="${FONT}"
        font-weight="800" font-size="${Math.round(size * 0.38)}" fill="${C.night}">130</text>
    </svg>`,
  );
}

async function ogImage() {
  const W = 1200;
  const H = 630;
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><filter id="b"><feGaussianBlur stdDeviation="70"/></filter></defs>
      <rect width="100%" height="100%" fill="${C.night}"/>
      <g filter="url(#b)" opacity="0.55">
        <circle cx="140" cy="90" r="210" fill="${C.cyan}"/>
        <circle cx="1080" cy="140" r="190" fill="${C.purple}"/>
        <circle cx="980" cy="600" r="170" fill="${C.gold}" opacity="0.7"/>
        <circle cx="260" cy="610" r="150" fill="${C.green}" opacity="0.7"/>
      </g>
      <rect x="250" y="95" width="700" height="300" rx="48" fill="${C.paper}"/>
      <text x="50%" y="478" text-anchor="middle" font-family="${FONT}" font-weight="800"
        font-size="64" fill="${C.paper}">${esc("130 UNICEF клуб")}</text>
      <text x="50%" y="536" text-anchor="middle" font-family="${FONT}" font-weight="500"
        font-size="32" fill="${C.paper}" fill-opacity="0.8">${esc("130-р сургууль × UNICEF")}</text>
      ${[C.cyan, C.purple, C.green, C.blue, C.gold]
        .map((c, i) => `<rect x="${i * 240}" y="${H - 12}" width="240" height="12" fill="${c}"/>`)
        .join("")}
    </svg>`,
  );

  // Logo card content (centered in the white card: x 250..950, y 95..395)
  const layers: OverlayOptions[] = [];
  const cardX = 250;
  const cardY = 95;
  const cardW = 700;
  const cardH = 300;
  const logos = [SCHOOL, UNICEF].filter((p) => existsSync(p));
  if (logos.length === 0) {
    const size = 200;
    layers.push({
      input: monogramSvg(size),
      left: cardX + (cardW - size) / 2,
      top: cardY + (cardH - size) / 2,
    });
  } else {
    const boxH = 200;
    const boxW = logos.length === 2 ? 260 : 400;
    const fitted = await Promise.all(logos.map((p) => logoFit(p, boxW, boxH)));
    const gap = logos.length === 2 ? 90 : 0;
    const total = fitted.reduce((a, f) => a + f.info.width, 0) + gap;
    let x = cardX + (cardW - total) / 2;
    fitted.forEach((f, i) => {
      layers.push({
        input: f.data,
        left: Math.round(x),
        top: Math.round(cardY + (cardH - f.info.height) / 2),
      });
      x += f.info.width;
      if (i === 0 && logos.length === 2) {
        layers.push({
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${gap}" height="80"><text x="50%" y="58" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="56" fill="#9ca3af">×</text></svg>`,
          ),
          left: Math.round(x),
          top: Math.round(cardY + (cardH - 80) / 2),
        });
        x += gap;
      }
    });
  }
  await sharp(bg).composite(layers).png({ compressionLevel: 9 }).toFile("public/og-default.png");
}

/** Square icon: the school logo on a white rounded tile, or the "130" badge. */
async function icon(size: number, opaque: boolean) {
  if (existsSync(SCHOOL)) {
    const pad = Math.round(size * 0.1);
    const { data, info } = await logoFit(SCHOOL, size - pad * 2, size - pad * 2);
    const tile = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" rx="${opaque ? 0 : Math.round(size * 0.22)}" fill="${C.paper}"/></svg>`,
    );
    return sharp(tile)
      .composite([
        {
          input: data,
          left: Math.round((size - info.width) / 2),
          top: Math.round((size - info.height) / 2),
        },
      ])
      .png()
      .toBuffer();
  }
  const badge = await sharp(monogramSvg(size)).png().toBuffer();
  if (!opaque) return badge;
  return sharp({
    create: { width: size, height: size, channels: 4, background: C.paper },
  })
    .composite([{ input: badge }])
    .png()
    .toBuffer();
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

await ogImage();
await writeFile("src/app/icon.png", await icon(512, false));
await writeFile("src/app/apple-icon.png", await icon(180, true));
const sizes = [16, 32, 48];
await writeFile(
  "src/app/favicon.ico",
  ico(await Promise.all(sizes.map(async (size) => ({ size, data: await icon(size, false) })))),
);

console.log(
  `✅ Brand assets written (${existsSync(SCHOOL) ? "with school logo" : 'no logo file → "130" badge'}${existsSync(UNICEF) ? " + UNICEF logo" : ""}).`,
);
