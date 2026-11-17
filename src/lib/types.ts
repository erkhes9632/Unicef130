/** Domain types shared by the D1 data layer and the UI. */

/** Tiptap / ProseMirror JSON document (stored as JSON in D1). */
export type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};
export type RichTextDoc = { type: "doc"; content?: RichTextNode[] };

/**
 * News categories follow the club's three directions (+ announcements):
 * activity = Нөлөөлөл (advocacy), education = Боловсрол, charity = Хандив (fundraising).
 * Events use the same keys in `events.direction`.
 */
export const newsCategories = ["activity", "education", "charity", "announcement"] as const;
export const clubDirections = ["activity", "education", "charity"] as const;
export type ClubDirection = (typeof clubDirections)[number];
export type NewsCategory = (typeof newsCategories)[number];

export type GalleryImage = {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  alt: string;
  order: number;
};
