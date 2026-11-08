/**
 * Domain types shared by the mock data (Phase 2), the D1 data layer (Phase 5) and the UI.
 * Content fields have an optional English variant (`*En`); the data layer resolves them per locale.
 */

/** Tiptap / ProseMirror JSON document (stored as JSON in D1). */
export type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};
export type RichTextDoc = { type: "doc"; content?: RichTextNode[] };

export const newsCategories = [
  "activity",
  "volunteering",
  "rights",
  "charity",
  "announcement",
] as const;
export type NewsCategory = (typeof newsCategories)[number];

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  excerpt: string;
  excerptEn?: string | null;
  content: RichTextDoc;
  contentEn?: RichTextDoc | null;
  coverUrl: string | null;
  category: NewsCategory;
  tags: string[];
  status: "draft" | "published";
  /** ISO 8601 */
  publishedAt: string | null;
};

export type ClubEvent = {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  summary: string;
  summaryEn?: string | null;
  content: RichTextDoc;
  contentEn?: RichTextDoc | null;
  coverUrl: string | null;
  location: string;
  locationEn?: string | null;
  /** ISO 8601 (with offset) */
  startsAt: string;
  endsAt: string | null;
  published: boolean;
};

export type MemberGroup = "leadership" | "member";

export type Member = {
  id: string;
  name: string;
  nameEn?: string | null;
  role: string;
  roleEn?: string | null;
  /** School class, e.g. "10А" */
  className: string;
  group: MemberGroup;
  photoUrl: string | null;
  /** Members are mostly minors: photos are only shown when explicitly allowed. */
  showPhoto: boolean;
  order: number;
};

export type GalleryImage = {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  alt: string;
  order: number;
};

export type Album = {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  coverUrl: string | null;
  images: GalleryImage[];
  published: boolean;
};
