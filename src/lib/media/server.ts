import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, MEDIA_PREFIX, type MediaKind } from "./constants";

const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Detects the real image type from magic bytes (never trust the declared MIME type). */
export function sniffImageType(bytes: Uint8Array): (typeof ALLOWED_UPLOAD_TYPES)[number] | null {
  const b = bytes;
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return "image/webp";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return "image/png";
  return null;
}

export class UploadError extends Error {}

/** Validates and stores an image in R2. Returns its public URL (/media/<key>). */
export async function storeImage(file: File, kind: MediaKind, variant: "full" | "thumb" = "full") {
  if (file.size === 0) throw new UploadError("Файл хоосон байна.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Файл хэт том байна (5MB хүртэл).");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new UploadError("Зөвхөн JPG, PNG, WebP зураг оруулна уу.");

  const now = new Date();
  const key = `${kind}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}${variant === "thumb" ? "-thumb" : ""}.${EXT[type]}`;
  const { env } = await getCloudflareContext({ async: true });
  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
  });
  return { key, url: `${MEDIA_PREFIX}${key}` };
}

/** Deletes R2 objects for the given /media/... URLs (others, e.g. /placeholders, are ignored). */
export async function deleteMediaUrls(urls: (string | null | undefined)[]) {
  const keys = urls
    .filter((u): u is string => typeof u === "string" && u.startsWith(MEDIA_PREFIX))
    .map((u) => u.slice(MEDIA_PREFIX.length))
    .filter((k) => /^[a-z]+\/[\w/.-]+$/.test(k) && !k.includes(".."));
  if (!keys.length) return;
  try {
    const { env } = await getCloudflareContext({ async: true });
    await env.MEDIA.delete(keys);
  } catch (err) {
    console.error("[media] failed to delete", keys, err);
  }
}

/** True for URLs our upload endpoint produced for the given kind. */
export function isOwnMediaUrl(url: string, kind?: MediaKind) {
  return url.startsWith(`${MEDIA_PREFIX}${kind ? `${kind}/` : ""}`) && !url.includes("..");
}
