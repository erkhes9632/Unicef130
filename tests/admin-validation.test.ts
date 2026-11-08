import { describe, expect, test } from "bun:test";
import {
  eventInputSchema,
  newsInputSchema,
  settingsInputSchema,
  userCreateSchema,
} from "@/lib/validation/admin";

const doc = {
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text: "Сайн" }] }],
};

describe("admin schemas", () => {
  const news = {
    title: "Гарчиг",
    titleEn: "",
    slug: "",
    excerpt: "Товч",
    excerptEn: "",
    category: "rights",
    tags: ["a"],
    coverUrl: "",
    content: doc,
    contentEn: null,
    status: "draft",
    publishedAt: null,
  };
  test("news: empty strings become null, slug format enforced", () => {
    const r = newsInputSchema.parse(news);
    expect(r.titleEn).toBeNull();
    expect(r.coverUrl).toBeNull();
    expect(newsInputSchema.safeParse({ ...news, slug: "Bad Slug" }).success).toBe(false);
    expect(newsInputSchema.safeParse({ ...news, slug: "good-slug-2" }).success).toBe(true);
  });
  test("news: image URLs must be relative or https", () => {
    expect(newsInputSchema.safeParse({ ...news, coverUrl: "/media/news/x.webp" }).success).toBe(
      true,
    );
    expect(newsInputSchema.safeParse({ ...news, coverUrl: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(newsInputSchema.safeParse({ ...news, coverUrl: "//evil.example/x.png" }).success).toBe(
      false,
    );
    expect(
      newsInputSchema.safeParse({ ...news, coverUrl: "http://insecure.example/x.png" }).success,
    ).toBe(false);
  });
  test("events: end must be after start", () => {
    const base = {
      title: "А",
      titleEn: "",
      slug: "",
      summary: "Б",
      summaryEn: "",
      location: "В",
      locationEn: "",
      coverUrl: "",
      content: doc,
      contentEn: null,
      published: true,
    };
    expect(
      eventInputSchema.safeParse({
        ...base,
        startsAt: new Date(2026, 1, 2),
        endsAt: new Date(2026, 1, 1),
      }).success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({ ...base, startsAt: new Date(2026, 1, 1), endsAt: null }).success,
    ).toBe(true);
  });
  test("settings: only Google Maps embeds and https social links", () => {
    const s = {
      contact: {
        address: "",
        email: "",
        phone: "",
        officeHours: "",
        mapEmbedUrl: "https://www.google.com/maps/embed?pb=1",
      },
      socials: [{ platform: "facebook", url: "https://facebook.com/x" }],
      stats: { members: 1, events: 1, volunteerHours: 1, childrenHelped: 1 },
      donationUrl: "",
    };
    expect(settingsInputSchema.safeParse(s).success).toBe(true);
    expect(
      settingsInputSchema.safeParse({
        ...s,
        contact: { ...s.contact, mapEmbedUrl: "https://evil.example/embed" },
      }).success,
    ).toBe(false);
    expect(
      settingsInputSchema.safeParse({
        ...s,
        socials: [{ platform: "facebook", url: "javascript:x" }],
      }).success,
    ).toBe(false);
  });
  test("users: password optional but ≥10 chars when given", () => {
    expect(
      userCreateSchema.safeParse({ name: "Н", email: "a@b.mn", role: "editor", password: "" })
        .success,
    ).toBe(true);
    expect(
      userCreateSchema.safeParse({ name: "Н", email: "a@b.mn", role: "editor", password: "short" })
        .success,
    ).toBe(false);
    expect(
      userCreateSchema.safeParse({ name: "Н", email: "a@b.mn", role: "owner", password: "" })
        .success,
    ).toBe(false);
  });
});
