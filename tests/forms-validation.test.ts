import { describe, expect, test } from "bun:test";
import {
  contactFormSchema,
  joinFormSchema,
  normalizeClassName,
  normalizePhone,
} from "@/lib/validation/forms";

const validJoin = {
  fullName: "Батын Анужин",
  className: "10А",
  phone: "9911 2233",
  email: "",
  reason: "Хүүхдүүдэд туслахыг хүсэж байна.",
  helpWith: ["reading"],
  consent: true,
};

describe("join form schema", () => {
  test("accepts a valid application (email optional)", () => {
    expect(joinFormSchema.safeParse(validJoin).success).toBe(true);
    expect(joinFormSchema.safeParse({ ...validJoin, email: "a@b.mn" }).success).toBe(true);
  });
  test.each([
    ["className", "abc", "className"],
    ["phone", "123", "phone"],
    ["email", "not-an-email", "email"],
    ["reason", "short", "tooShort"],
    ["fullName", "", "required"],
  ])("rejects bad %s", (field, value, code) => {
    const r = joinFormSchema.safeParse({ ...validJoin, [field]: value });
    expect(r.success).toBe(false);
    expect(r.error!.issues.find((i) => i.path[0] === field)?.message).toBe(code);
  });
  test("requires consent and at least one help option", () => {
    expect(joinFormSchema.safeParse({ ...validJoin, consent: false }).success).toBe(false);
    expect(joinFormSchema.safeParse({ ...validJoin, helpWith: [] }).success).toBe(false);
    expect(joinFormSchema.safeParse({ ...validJoin, helpWith: ["hacking"] }).success).toBe(false);
  });
  test("accepts common class/phone formats", () => {
    for (const c of ["10А", "10 а", "9-Б", "11A", "8"])
      expect(joinFormSchema.safeParse({ ...validJoin, className: c }).success).toBe(true);
    for (const p of ["99112233", "+976 9911 2233", "976-9911-2233", "9911-2233"])
      expect(joinFormSchema.safeParse({ ...validJoin, phone: p }).success).toBe(true);
  });
  test("normalizers", () => {
    expect(normalizePhone("9911 2233")).toBe("+97699112233");
    expect(normalizePhone("+976-9911-2233")).toBe("+97699112233");
    expect(normalizeClassName("10 а")).toBe("10А");
    expect(normalizeClassName("9-б")).toBe("9Б");
  });
});

describe("contact form schema", () => {
  test("validates", () => {
    expect(
      contactFormSchema.safeParse({
        name: "Эцэг эх",
        email: "a@b.mn",
        subject: "",
        message: "Сайн байна уу, асуулт байна.",
      }).success,
    ).toBe(true);
    expect(
      contactFormSchema.safeParse({ name: "Э", email: "bad", subject: "", message: "hi" }).success,
    ).toBe(false);
  });
});
