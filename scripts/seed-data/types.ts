/**
 * Shapes of the sample content in scripts/seed-data (local development only). Content fields
 * have an optional English variant (`*En`), as in D1.
 */
import type { GalleryImage, NewsCategory, RichTextDoc } from "@/lib/types";

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
