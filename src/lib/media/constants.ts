/** Shared (client + server) media limits. */
export const MEDIA_KINDS = ["news", "events", "members", "gallery"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // after client-side compression
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // original file picked by the user
export const ALLOWED_UPLOAD_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

export const FULL_MAX_EDGE = 1920;
export const THUMB_MAX_EDGE = 640;
export const MEDIA_PREFIX = "/media/";
