import "./zod-config";
import { z } from "zod";

/** Admin schema for a recruitment period (Mongolian messages; the admin UI is Mongolian only). */

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label}: хамгийн ихдээ ${max} тэмдэгт.` });

const questionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/),
    type: z.enum(["text", "choice", "checkbox"]),
    label: z
      .string()
      .trim()
      .min(1, { error: "Асуулт бүрийн текстийг бөглөнө." })
      .max(200, { error: "Асуулт хэт урт байна." }),
    labelEn: text(200, "Question (English)"),
    options: z
      .array(
        z.object({
          label: z
            .string()
            .trim()
            .min(1, { error: "Сонголтын текстийг бөглөнө." })
            .max(100, { error: "Сонголт хэт урт байна." }),
          labelEn: text(100, "Option (English)"),
        }),
      )
      .max(12, { error: "Асуултад хамгийн ихдээ 12 сонголт." }),
    required: z.boolean(),
  })
  .refine((q) => q.type !== "choice" || q.options.length >= 2, {
    error: "«Сонголт» төрлийн асуултад дор хаяж 2 сонголт оруулна.",
  });

export const periodInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Нэрийг бөглөнө." })
      .max(120, { error: "Нэр хэт урт байна." }),
    nameEn: text(120, "Name (English)").transform((v) => v || null),
    schoolYear: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, { error: "Хичээлийн жилийг 2026-2027 хэлбэрээр бичнэ." }),
    opensAt: z.date({ error: "Нээгдэх огноо, цагийг оруулна." }),
    closesAt: z.date({ error: "Хаагдах огноо, цагийг оруулна." }),
    capacity: z
      .number({ error: "Багтаамж: тоо оруулна." })
      .int()
      .min(1, { error: "Багтаамж дор хаяж 1 байна." })
      .max(10_000)
      .nullable(),
    whenFull: z.enum(["close", "waitlist"]),
    classes: z
      .array(z.string().regex(/^\d{1,2}\p{L}{0,2}$/u))
      .max(120, { error: "Хамгийн ихдээ 120 анги." }),
    introText: text(1500, "Танилцуулга"),
    introTextEn: text(1500, "Intro (English)").transform((v) => v || null),
    closedMessage: text(500, "Хаалттай үеийн текст"),
    closedMessageEn: text(500, "Closed message (English)").transform((v) => v || null),
    questions: z
      .array(questionSchema)
      .max(10, { error: "Хамгийн ихдээ 10 нэмэлт асуулт." })
      .refine((list) => new Set(list.map((q) => q.id)).size === list.length, {
        error: "Асуултын дугаар давхардсан байна.",
      }),
    showBanner: z.boolean(),
  })
  .refine((p) => p.closesAt > p.opensAt, {
    path: ["closesAt"],
    error: "Хаагдах цаг нь нээгдэх цагаас хойш байх ёстой.",
  });
export type PeriodInput = z.output<typeof periodInputSchema>;
