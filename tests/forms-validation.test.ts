import { describe, expect, test } from "bun:test";
import { buildJoinSchema, contactFormSchema } from "@/lib/validation/forms";

const questions = [
  { id: "q1", type: "text" as const, options: [], required: true },
  { id: "q2", type: "choice" as const, options: ["Тийм", "Үгүй"], required: false },
  { id: "q3", type: "checkbox" as const, options: [], required: true },
];
const joinFormSchema = buildJoinSchema({ classes: ["10А", "10Б", "11А"], questions });

const validJoin = {
  fullName: "Батын Анужин",
  className: "10А",
  phone: "8811 2233",
  reason: "Хүүхдүүдэд туслахыг хүсэж байна.",
  helpWith: ["reading"],
  answers: { q1: "Найзаасаа сонссон", q2: "Тийм", q3: true },
  consent: true,
};

describe("join form schema (per recruitment period)", () => {
  test("accepts a valid application; the e-mail comes from the account, not the form", () => {
    expect(joinFormSchema.safeParse(validJoin).success).toBe(true);
    const parsed = joinFormSchema.parse({ ...validJoin, email: "someone@else.mn" });
    expect("email" in parsed).toBe(false);
  });
  test.each([
    ["className", "abc", "className"],
    ["className", "9В", "className"], // not offered in this period
    ["phone", "123", "phone"],
    ["phone", "5511 2233", "phone"],
    ["reason", "short", "tooShort"],
    ["reason", "Манай сайтыг үзээрэй http://spam.example", "noLinks"],
    ["fullName", "", "required"],
    ["fullName", "Anujin Bat", "nameCyrillic"],
    ["fullName", "Анужин", "nameCyrillic"],
  ])("rejects bad %s (%s)", (field, value, code) => {
    const r = joinFormSchema.safeParse({ ...validJoin, [field]: value });
    expect(r.success).toBe(false);
    expect(r.error!.issues.find((i) => i.path[0] === field)?.message).toBe(code);
  });
  test("requires consent and at least one help option", () => {
    expect(joinFormSchema.safeParse({ ...validJoin, consent: false }).success).toBe(false);
    expect(joinFormSchema.safeParse({ ...validJoin, helpWith: [] }).success).toBe(false);
    expect(joinFormSchema.safeParse({ ...validJoin, helpWith: ["<script>"] }).success).toBe(false);
  });
  test("custom questions: required, choice from the list, no links", () => {
    const withAnswers = (answers: Record<string, string | boolean>) =>
      joinFormSchema.safeParse({ ...validJoin, answers }).success;
    expect(withAnswers({ q1: "", q2: "", q3: true })).toBe(false); // required text
    expect(withAnswers({ q1: "ok", q2: "", q3: false })).toBe(false); // required checkbox
    expect(withAnswers({ q1: "ok", q2: "Магадгүй", q3: true })).toBe(false); // not an option
    expect(withAnswers({ q1: "www.spam.com", q2: "", q3: true })).toBe(false);
    expect(withAnswers({ q1: "ok", q2: "", q3: true })).toBe(true); // optional choice left empty
  });
  test("class list is matched case-insensitively; free text when the period has no list", () => {
    expect(joinFormSchema.safeParse({ ...validJoin, className: "10 а" }).success).toBe(true);
    const open = buildJoinSchema({ classes: [], questions: [] });
    for (const c of ["10А", "9-Б", "11A", "8"])
      expect(open.safeParse({ ...validJoin, answers: {}, className: c }).success).toBe(true);
    for (const p of ["88112233", "+976 8811 2233", "976-8811-2233", "8811-2233"])
      expect(open.safeParse({ ...validJoin, answers: {}, phone: p }).success).toBe(true);
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
