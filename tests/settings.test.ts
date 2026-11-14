import { describe, expect, test } from "bun:test";
import { defaultHelpOptions, defaultSettings, parseSettings } from "@/lib/settings/types";

describe("site settings parsing", () => {
  test("empty database → empty defaults (no invented facts)", () => {
    const s = parseSettings(new Map());
    expect(s.stats).toEqual([]);
    expect(s.partners).toEqual([]);
    expect(s.socials).toEqual([]);
    expect(s.contact.email).toBe("");
    expect(s.contact.phone).toBe("");
    expect(s.contact.officeHours).toBe("");
    expect(s.donation).toEqual({ url: "", text: "", textEn: "" });
    // Draft About text is hidden until the club publishes it.
    expect(s.about.historyPublished).toBe(false);
    expect(s.about.history).toBe("");
    expect(s.helpOptions).toEqual(defaultHelpOptions);
  });

  test("legacy rows from the old settings shape are ignored or migrated", () => {
    const s = parseSettings(
      new Map<string, unknown>([
        ["stats", { members: 40, events: 12, volunteerHours: 300, childrenHelped: 500 }],
        ["donationUrl", "https://school.example/donate"],
        [
          "socials",
          [
            { platform: "facebook", url: "" },
            { platform: "instagram", url: "https://i" },
          ],
        ],
      ]),
    );
    expect(s.stats).toEqual([]);
    expect(s.donation.url).toBe("https://school.example/donate");
    expect(s.socials).toEqual([{ platform: "instagram", url: "https://i" }]);
  });

  test("bad fields fall back per field, valid ones are kept", () => {
    const s = parseSettings(
      new Map<string, unknown>([
        ["contact", { email: "club@school.mn", phone: 12345, unknown: "x" }],
        [
          "helpOptions",
          [
            { key: "BAD KEY", label: "x" },
            { key: "art", label: "Зураг зурах" },
          ],
        ],
        ["page.about", { historyPublished: "yes", mission: "Зорилго" }],
      ]),
    );
    expect(s.contact.email).toBe("club@school.mn");
    expect(s.contact.phone).toBe("");
    expect(s.helpOptions).toEqual([{ key: "art", label: "Зураг зурах", labelEn: "" }]);
    expect(s.about.historyPublished).toBe(false);
    expect(s.about.mission).toBe("Зорилго");
    expect(s.about.values).toEqual([]);
  });

  test("defaults contain no placeholder contact data", () => {
    const json = JSON.stringify(defaultSettings);
    expect(json).not.toContain("example.com");
    expect(json).not.toContain("0000");
  });
});
