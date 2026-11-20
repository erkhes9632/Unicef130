/**
 * Removes metadata (EXIF incl. GPS, XMP, IPTC, text chunks) from JPEG, PNG and WebP bytes
 * without decoding the image. The browser already re-encodes uploads (which drops metadata);
 * this is the server-side safety net for photos of children, so it never trusts the client.
 * Unknown or malformed input is returned unchanged (the type was sniffed before this runs).
 */

const JPEG_METADATA_MARKERS = new Set([0xe1, 0xed]); // APP1 (Exif/XMP), APP13 (IPTC)

function stripJpeg(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 2)]; // SOI
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return b; // not a marker where one must be: leave the file alone
    const marker = b[i + 1]!;
    if (marker === 0xda) {
      // Start of scan: the compressed image data follows up to the end; keep everything.
      out.push(b.subarray(i));
      return concat(out);
    }
    const length = (b[i + 2]! << 8) | b[i + 3]!;
    if (length < 2 || i + 2 + length > b.length) return b;
    if (!JPEG_METADATA_MARKERS.has(marker)) out.push(b.subarray(i, i + 2 + length));
    i += 2 + length;
  }
  return b;
}

const PNG_METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function stripPng(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const length = ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
    const type = String.fromCharCode(b[i + 4]!, b[i + 5]!, b[i + 6]!, b[i + 7]!);
    const end = i + 12 + length;
    if (end > b.length) return b;
    if (!PNG_METADATA_CHUNKS.has(type)) out.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") return concat(out);
  }
  return b;
}

function stripWebp(b: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = String.fromCharCode(b[i]!, b[i + 1]!, b[i + 2]!, b[i + 3]!);
    const size = (b[i + 4]! | (b[i + 5]! << 8) | (b[i + 6]! << 16) | (b[i + 7]! << 24)) >>> 0;
    const end = i + 8 + size + (size % 2); // chunks are padded to an even size
    if (i + 8 + size > b.length) return b;
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = b.slice(i, Math.min(end, b.length));
      // VP8X flags: clear the EXIF (bit 3) and XMP (bit 2) bits of the removed chunks.
      if (type === "VP8X" && chunk.length > 8) chunk[8] = chunk[8]! & ~0b0000_1100;
      chunks.push(chunk);
    }
    i = end;
  }
  const body = concat(chunks);
  const header = b.slice(0, 12);
  const riffSize = body.length + 4; // "WEBP" + chunks
  header[4] = riffSize & 0xff;
  header[5] = (riffSize >> 8) & 0xff;
  header[6] = (riffSize >> 16) & 0xff;
  header[7] = (riffSize >>> 24) & 0xff;
  return concat([header, body]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function stripImageMetadata(
  bytes: Uint8Array,
  type: "image/jpeg" | "image/png" | "image/webp",
): Uint8Array {
  try {
    if (type === "image/jpeg") return stripJpeg(bytes);
    if (type === "image/png") return stripPng(bytes);
    return stripWebp(bytes);
  } catch {
    return bytes;
  }
}
