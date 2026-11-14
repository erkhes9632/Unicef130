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
    category: "education",
    tags: ["a"],
    coverUrl: "",
    content: doc,
    contentEn: null,
    status: "draft",
    publishedAt: null,
    sdgs: [4],
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
  test("events: school year format and SDG range", () => {
    const base = {
      title: "А",
      titleEn: "",
      slug: "",
      summary: "Б",
      summaryEn: "",
      location: "",
      locationEn: "",
      coverUrl: "",
      content: doc,
      contentEn: null,
      published: true,
      allDay: true,
      direction: null,
      schoolYear: "",
      reachInPerson: "",
      reachInPersonEn: "",
      reachOnline: null,
      donationAmount: null,
      partners: [],
      beneficiaries: [],
      sdgs: [],
      adminNote: "",
      startsAt: new Date(2026, 1, 1),
      endsAt: null,
    };
    expect(eventInputSchema.safeParse(base).success).toBe(true);
    expect(eventInputSchema.safeParse({ ...base, schoolYear: "2025/26" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, sdgs: [18] }).success).toBe(false);
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
      allDay: true,
      direction: "charity",
      schoolYear: "2025-2026",
      reachInPerson: "50+",
      reachInPersonEn: "",
      reachOnline: 1318,
      donationAmount: 700000,
      partners: [],
      beneficiaries: [],
      sdgs: [1],
      adminNote: "",
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
        addressEn: "",
        email: "",
        phone: "",
        officeHours: "",
        officeHoursEn: "",
        mapEmbedUrl: "https://www.google.com/maps/embed?pb=1",
        mapLat: "",
        mapLng: "",
      },
      club: { name: "", nameEn: "", description: "", descriptionEn: "", foundedYear: 2025 },
      branding: {
        schoolLogoUrl: "/media/site/2026/11/a.webp",
        unicefLogoUrl: "",
        heroImageUrl: "",
        heroImageAlt: "",
        heroImageAltEn: "",
      },
      socials: [{ platform: "facebook", url: "https://facebook.com/x" }],
      stats: [{ kind: "custom", label: "Гишүүн", labelEn: "", value: "25" }],
      partners: [
        { name: "Хамтрагч", nameEn: "", logoUrl: "", url: "https://example.org", type: "partner" },
      ],
      donation: { url: "", text: "", textEn: "" },
      helpOptions: [{ key: "events", label: "Арга хэмжээ", labelEn: "" }],
    };
    expect(settingsInputSchema.safeParse(s).success).toBe(true);
    // custom stat needs both a label and a value
    expect(
      settingsInputSchema.safeParse({
        ...s,
        stats: [{ kind: "custom", label: "Гишүүн", labelEn: "", value: "" }],
      }).success,
    ).toBe(false);
    // the join form needs at least one option, with unique keys
    expect(settingsInputSchema.safeParse({ ...s, helpOptions: [] }).success).toBe(false);
    expect(
      settingsInputSchema.safeParse({
        ...s,
        helpOptions: [s.helpOptions[0], s.helpOptions[0]],
      }).success,
    ).toBe(false);
    // coordinates: both or none, within range
    expect(
      settingsInputSchema.safeParse({ ...s, contact: { ...s.contact, mapLat: "47.9" } }).success,
    ).toBe(false);
    expect(
      settingsInputSchema.safeParse({
        ...s,
        contact: { ...s.contact, mapLat: "147.9", mapLng: "106.9" },
      }).success,
    ).toBe(false);
    expect(
      settingsInputSchema.safeParse({
        ...s,
        branding: { ...s.branding, heroImageUrl: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
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
