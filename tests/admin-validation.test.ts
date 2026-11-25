import { describe, expect, test } from "bun:test";
import { eventInputSchema, newsInputSchema, settingsInputSchema } from "@/lib/validation/admin";

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
    featured: false,
    metaTitle: "",
    metaDescription: "",
    albumId: null,
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
      signupEnabled: false,
      signupCapacity: null,
      signupDeadline: null,
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
      signupEnabled: false,
      signupCapacity: null,
      signupDeadline: null,
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
  test("settings: contact channels, https social links, safe images", () => {
    const s = {
      contact: {
        address: "",
        addressEn: "",
        email: "130foreverychild@gmail.com",
        instagram: "https://www.instagram.com/130_foreverychild/",
      },
      announcement: { enabled: false, text: "", textEn: "", href: "/join" },
      membership: { rejectedRetentionDays: 90, activeMemberHours: null },
      club: {
        name: "",
        nameEn: "",
        shortName: "",
        shortNameEn: "",
        description: "",
        descriptionEn: "",
        foundedYear: 2025,
      },
      branding: {
        schoolLogoUrl: "/media/site/2026/11/a.webp",
        heroImageUrl: "",
        heroImageAlt: "",
        heroImageAltEn: "",
      },
      socials: [{ platform: "facebook", url: "https://facebook.com/x" }],
      stats: [{ kind: "custom", label: "Гишүүн", labelEn: "", value: "25", featured: true }],
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
        stats: [{ kind: "custom", label: "Гишүүн", labelEn: "", value: "", featured: true }],
      }).success,
    ).toBe(false);
    // announcement link: internal path or https only
    expect(
      settingsInputSchema.safeParse({
        ...s,
        announcement: { enabled: true, text: "x", textEn: "", href: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
    // at most 5 stats featured on the home page
    expect(
      settingsInputSchema.safeParse({
        ...s,
        stats: Array.from({ length: 6 }, (_, i) => ({
          kind: "custom",
          label: `L${i}`,
          labelEn: "",
          value: "1",
          featured: true,
        })),
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
    // Instagram: a profile URL is stored as the handle; anything else is refused
    expect(settingsInputSchema.parse(s).contact.instagram).toBe("130_foreverychild");
    expect(
      settingsInputSchema.safeParse({
        ...s,
        contact: { ...s.contact, instagram: "https://evil.example/x" },
      }).success,
    ).toBe(false);
    expect(
      settingsInputSchema.safeParse({ ...s, contact: { ...s.contact, email: "not-an-email" } })
        .success,
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
        socials: [{ platform: "facebook", url: "javascript:x" }],
      }).success,
    ).toBe(false);
  });
});
