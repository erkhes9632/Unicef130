"use client";

import { MAX_SOURCE_BYTES, type MediaKind } from "./constants";

export type ProcessedImage = { blob: Blob; width: number; height: number };

/**
 * Resizes + re-encodes an image in the browser (WebP, JPEG fallback). Re-encoding also strips
 * EXIF metadata such as GPS location — important for photos of children.
 */
export async function processImage(
  file: File,
  maxEdge: number,
  quality = 0.82,
): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Зөвхөн зураг сонгоно уу.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Зураг хэт том байна (25MB хүртэл).");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg"); // older Safari
  if (!blob) throw new Error("Зургийг боловсруулж чадсангүй.");
  return { blob, width, height };
}

export async function uploadImage(blob: Blob, kind: MediaKind, variant: "full" | "thumb" = "full") {
  const body = new FormData();
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  body.append("file", blob, `upload.${ext}`);
  body.append("kind", kind);
  body.append("variant", variant);
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Зураг хуулахад алдаа гарлаа.");
  return data.url;
}
