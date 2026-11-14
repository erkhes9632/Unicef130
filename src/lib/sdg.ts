/**
 * UN Sustainable Development Goals: official colors, number and short names (mn/en).
 * Text color per goal is chosen for WCAG AA contrast on the official background.
 */
export type SdgInfo = { color: string; text: "light" | "dark"; mn: string; en: string };

export const SDGS: Record<number, SdgInfo> = {
  1: { color: "#E5243B", text: "light", mn: "Ядуурлыг устгах", en: "No poverty" },
  2: { color: "#DDA63A", text: "dark", mn: "Өлсгөлөнг устгах", en: "Zero hunger" },
  3: {
    color: "#4C9F38",
    text: "dark",
    mn: "Эрүүл мэнд, сайн сайхан байдал",
    en: "Good health and well-being",
  },
  4: { color: "#C5192D", text: "light", mn: "Чанартай боловсрол", en: "Quality education" },
  5: { color: "#FF3A21", text: "dark", mn: "Жендэрийн тэгш байдал", en: "Gender equality" },
  6: {
    color: "#26BDE2",
    text: "dark",
    mn: "Цэвэр ус, ариун цэвэр",
    en: "Clean water and sanitation",
  },
  7: { color: "#FCC30B", text: "dark", mn: "Цэвэр эрчим хүч", en: "Affordable and clean energy" },
  8: {
    color: "#A21942",
    text: "light",
    mn: "Зохистой ажил, эдийн засгийн өсөлт",
    en: "Decent work and economic growth",
  },
  9: {
    color: "#FD6925",
    text: "dark",
    mn: "Үйлдвэржилт, инноваци, дэд бүтэц",
    en: "Industry, innovation and infrastructure",
  },
  10: {
    color: "#DD1367",
    text: "light",
    mn: "Тэгш бус байдлыг бууруулах",
    en: "Reduced inequalities",
  },
  11: {
    color: "#FD9D24",
    text: "dark",
    mn: "Тогтвортой хот, суурин",
    en: "Sustainable cities and communities",
  },
  12: {
    color: "#BF8B2E",
    text: "dark",
    mn: "Хариуцлагатай хэрэглээ, үйлдвэрлэл",
    en: "Responsible consumption and production",
  },
  13: {
    color: "#3F7E44",
    text: "light",
    mn: "Уур амьсгалын өөрчлөлттэй тэмцэх",
    en: "Climate action",
  },
  14: { color: "#0A97D9", text: "dark", mn: "Усан доорх амьдрал", en: "Life below water" },
  15: { color: "#56C02B", text: "dark", mn: "Хуурай газрын амьдрал", en: "Life on land" },
  16: {
    color: "#00689D",
    text: "light",
    mn: "Энх тайван, шударга ёс, хүчтэй институц",
    en: "Peace, justice and strong institutions",
  },
  17: {
    color: "#19486A",
    text: "light",
    mn: "Зорилгын төлөөх түншлэл",
    en: "Partnerships for the goals",
  },
};

export const isSdg = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 17;

/** Sorted, unique, valid goal numbers. */
export function normalizeSdgs(list: unknown): number[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(isSdg))].sort((a, b) => a - b);
}

/** "SDG 1, SD 16, SDg10" → [1, 10, 16] (fixes common typos in source data). */
export function parseSdgList(input: string): number[] {
  return normalizeSdgs([...input.matchAll(/(?:sdg?|тхз)?\s*(\d{1,2})/gi)].map((m) => Number(m[1])));
}
