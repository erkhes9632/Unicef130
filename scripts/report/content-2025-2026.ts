/**
 * Curated data for the 2025–2026 report import (checked against the original .docx by
 * parse-docx.ts). Public content only: no member names, no phone numbers.
 *
 * - Numbers, dates, SDGs and pillars are the cleaned values agreed with the club; the parser
 *   reports every place where the .docx differs (e.g. the shifted columns of activity 5).
 * - Mongolian descriptions come from the .docx (typo fixes only, see TEXT_FIXES); the English
 *   texts below are translations of them, nothing added.
 * - Photo decisions are keyed by the first 12 hex chars of the image's sha256.
 */

export type Pillar = "advocacy" | "education" | "fundraising";

export type CuratedActivity = {
  n: number;
  pillar: Pillar;
  title: string;
  titleEn: string;
  /** YYYY-MM-DD (the report writes DD/MM/YYYY) */
  start: string;
  end: string | null;
  inPerson: {
    value: number | null;
    approx?: boolean;
    atLeast?: boolean;
    /** Wording when the report gives text instead of (or next to) the number. */
    text?: string;
    textEn?: string;
  };
  online: number;
  raised: number | null;
  sdgs: number[];
  partners: string[];
  beneficiaries: string[];
  location: string;
  locationEn: string;
  textEn: string;
  /** Admin-only note about the source data (never shown publicly). */
  note: string;
};

export const SCHOOL_YEAR = "2025-2026";
/** Fixed timestamp for created/updated columns, so re-running the import changes nothing. */
export const CONTENT_VERSION = "2026-11-21";

export const CLUB = {
  school: "130-р сургууль",
  schoolEn: "School No. 130",
  name: "130-р сургуулийн UNICEF клуб",
  nameEn: "UNICEF Club of School No. 130",
  foundedYear: 2025,
};

/** Leadership roles in report order (names come from the .docx and stay private). */
export const LEADER_ROLES = [
  { role: "Ахлагч", roleEn: "Club leader" },
  { role: "Дэд ахлагч", roleEn: "Deputy leader" },
  { role: "Санхүүч", roleEn: "Treasurer" },
  { role: "Нарийн бичиг", roleEn: "Secretary" },
  { role: "Зөвлөгч багш", roleEn: "Advisor teacher" },
];

export const MEMBERSHIP = { totalJoined: 115, active: 52, hours: 734 };

export const ORGANISATIONS = [
  { name: "BSU UNICEF Club", nameEn: "BSU UNICEF Club", type: "partner" },
  { name: "Лантуун Дохио", nameEn: "Lantuun Dokhio", type: "partner" },
  { name: "Bridge Blue Agency", nameEn: "Bridge Blue Agency", type: "partner" },
  { name: "Өнөр асрамжийн газар", nameEn: "Unur care centre", type: "beneficiary" },
] as const;

/** Typo fixes applied to report text (title, description, SDG notes). */
export const TEXT_FIXES: [RegExp, string][] = [
  [/\bUnicef\b/g, "UNICEF"],
  [/\byout\b/g, "youth"],
  [/\bSDg\b/g, "SDG"],
  [/\bSD (\d)/g, "SDG $1"],
];

export const ACTIVITIES: CuratedActivity[] = [
  {
    n: 1,
    pillar: "advocacy",
    title: "Хандивын үйл ажиллагаа",
    titleEn: "Donation drive",
    start: "2025-11-17",
    end: "2025-12-19",
    inPerson: { value: 137 },
    online: 2193,
    raised: null,
    sdgs: [1, 10],
    partners: ["BSU UNICEF Club"],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn:
      "Together with BSU UNICEF Club, we organised a New Year donation drive and collected a total of 60 books and 77 items of clothing from the school's students and teachers. The collected donations were given so that they would reach children in need.",
    note: "",
  },
  {
    n: 2,
    pillar: "advocacy",
    title: "Шинэ жилийн хандив",
    titleEn: "New Year donation",
    start: "2025-12-20",
    end: null,
    inPerson: { value: 500, approx: true },
    online: 85800,
    raised: null,
    sdgs: [1, 3],
    partners: ["BSU UNICEF Club"],
    beneficiaries: ["Өнөр асрамжийн газар"],
    location: "Дарь-Эхийн нийтийн байр",
    locationEn: "Dari-Ekh dormitory",
    textEn:
      "We took part in BSU UNICEF Club's New Year donation drive together with 5 members. We went to the Dari-Ekh dormitory and set up tables full of books and clothes. The people who came there chose the things they needed, and we delivered the many remaining items to the Unur care centre and donated them to children in need.",
    note: "Эх тайланд биечлэн хүрсэн тоо «ойролцоогоор 500».",
  },
  {
    n: 3,
    pillar: "advocacy",
    title: "Өгөхийн жаргал",
    titleEn: "The joy of giving",
    start: "2025-12-26",
    end: null,
    inPerson: { value: 1000 },
    online: 1694,
    raised: null,
    sdgs: [10],
    partners: ["Лантуун Дохио"],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn:
      "We prepared and donated 50 gift packs, each containing sweets, juice, warm socks, a notebook and a pen. We also donated 15 pairs of shoes and 15 jackets to the Lantuun Dokhio organisation and helped them wrap 1,000 gifts as part of the New Year charity campaign they were organising.",
    note: "",
  },
  {
    n: 4,
    pillar: "advocacy",
    title: "Мод тарих ажиллагаа",
    titleEn: "Tree planting",
    start: "2026-04-25",
    end: null,
    inPerson: { value: null, text: "Сургуулийн хүрээлэл", textEn: "School community" },
    online: 5172,
    raised: null,
    sdgs: [13, 15],
    partners: [],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn: "Club members planted 10+ trees outside the school.",
    note: "Эх тайланд биечлэн хүрсэн тоог «Сургуулийн хүрээлэл» гэж бичсэн (тоо биш).",
  },
  {
    n: 5,
    pillar: "education",
    title: "UNICEF анхны уулзалт",
    titleEn: "First UNICEF meeting",
    start: "2025-11-11",
    end: null,
    inPerson: { value: 50 },
    online: 0,
    raised: null,
    sdgs: [17],
    partners: [],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn:
      "At the club's first meeting, held among the members, we introduced the club's goals, the yearly plan and UNICEF's core values.",
    note: "Эх тайланд энэ мөрийн баганууд шилжсэн: биечлэн 50, онлайн 0 гэж оруулав.",
  },
  {
    n: 6,
    pillar: "education",
    title: "UNICEF баг хуваалт",
    titleEn: "Forming UNICEF teams",
    start: "2025-11-21",
    end: null,
    inPerson: { value: 60 },
    online: 0,
    raised: null,
    sdgs: [16],
    partners: [],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn:
      "By then our club had almost 100 members, and we found it difficult to involve every member actively in the activities. To solve this, we divided the members into 6 groups and organised them to work together until the end of that school year. We also organised a variety of interactive and fun activities to get to know our members better and build team spirit.",
    note: "",
  },
  {
    n: 7,
    pillar: "education",
    title: "Их сургуулийн зөвлөгчийг урив",
    titleEn: "A university mentor visits",
    start: "2026-04-21",
    end: null,
    inPerson: { value: 60, text: "60 сонсогч", textEn: "60 listeners" },
    online: 1403,
    raised: null,
    sdgs: [4],
    partners: ["Bridge Blue Agency"],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn:
      "Together with Bridge Blue Agency, we organised a mentoring session for students in grades 10–12 about the process of applying to universities and colleges and about studying and living abroad.",
    note: "",
  },
  {
    n: 8,
    pillar: "education",
    title: "Явган аялал",
    titleEn: "Hike",
    start: "2026-03-28",
    end: null,
    inPerson: { value: 19 },
    online: 1924,
    raised: null,
    sdgs: [3],
    partners: [],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn:
      "We organised a hike to strengthen the bonds between members and to increase their engagement in the club's activities.",
    note: "",
  },
  {
    n: 9,
    pillar: "fundraising",
    title: "Дулаан аяга, дулаан сэтгэл",
    titleEn: "Warm cup, warm heart",
    start: "2025-12-13",
    end: null,
    inPerson: { value: 50, atLeast: true },
    online: 1318,
    raised: 700000,
    sdgs: [1],
    partners: [],
    beneficiaries: [],
    location: "Богд Хан уул",
    locationEn: "Bogd Khan Mountain",
    textEn:
      "We held a charity sale on Bogd Khan Mountain, selling hot drinks and biscuits. As a result, we raised up to 700,000₮, and this income was later spent on a charity gift-wrapping campaign.",
    note: "",
  },
  {
    n: 10,
    pillar: "fundraising",
    title: "Тэмцээн ба хөгжилдөөн",
    titleEn: "Competition and fun",
    start: "2026-02-05",
    end: null,
    inPerson: { value: 150, atLeast: true },
    online: 1667,
    raised: 155000,
    sdgs: [3, 17],
    partners: [],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn:
      "During the school volleyball tournament, we organised a fundraising activity for donations and sold biscuits, yoghurt, popcorn and juice.",
    note: "",
  },
  {
    n: 11,
    pillar: "fundraising",
    title: "Волейболын тэмцээн",
    titleEn: "Volleyball tournament",
    start: "2026-03-01",
    end: null,
    inPerson: { value: 100 },
    online: 0,
    raised: null,
    sdgs: [17],
    partners: [],
    beneficiaries: [],
    location: "",
    locationEn: "",
    textEn: "We took part in a volleyball tournament organised to raise donations for UNICEF.",
    note: "Эх тайланд онлайн хүрсэн тоо, хандивын дүн бичигдээгүй (0 / хоосон).",
  },
];

/** Section 5 of the report: the official totals (source of truth, not recomputed). */
export const TOTALS = [
  {
    pillar: "advocacy",
    activities: 4,
    inPerson: 2000,
    inPersonLabel: "2,000",
    online: 94861,
    total: 96861,
    raised: 0,
  },
  {
    pillar: "education",
    activities: 5,
    inPerson: 189,
    inPersonLabel: "189",
    online: 3327,
    total: 3516,
    raised: 0,
  },
  {
    pillar: "fundraising",
    activities: 3,
    inPerson: 300,
    inPersonLabel: "300+",
    online: 2985,
    total: 3285,
    raised: 855000,
  },
  {
    pillar: "total",
    activities: 12,
    inPerson: 2489,
    inPersonLabel: "2,489",
    online: 101173,
    total: 103662,
    raised: 855000,
  },
] as const;

export type PhotoReview =
  | {
      keep: true;
      alt: string;
      altEn: string;
      /** Crop before resizing (pixels of the original), e.g. to remove app UI bars. */
      crop?: { left: number; top: number; width: number; height: number };
      note?: string;
    }
  | { keep: false; reason: string };

/** Every image in the .docx, reviewed by eye. Key = sha256 prefix (12 hex chars). */
export const PHOTO_REVIEW: Record<string, PhotoReview> = {
  "5fb15bfce424": { keep: false, reason: "Logo (UNICEF Club Mongolia) in the page header." },
  "18d840af2c50": { keep: false, reason: "1×1 px spacer image in the page header." },
  "1c9b503b6a0c": {
    keep: true,
    alt: "Сургуулийн танхимд тавьсан, гацуур модны наалттай хандивын сав",
    altEn: "A donation bin with Christmas-tree stickers in the school hall",
  },
  "8e493e1ea363": {
    keep: false,
    reason:
      "Donation hand-out: visitors receiving the donated books, including young children, with faces visible (aid recipients).",
  },
  "1b30a9e35aff": {
    keep: false,
    reason: "Young children choosing donated books, faces visible (aid recipients).",
  },
  de8e70a7ea33: {
    keep: true,
    alt: "Гишүүд сургуулийн гадаа мод тарихаар шороо ухаж байна",
    altEn: "Members digging soil to plant a tree outside the school",
  },
  f144a63c5c61: {
    keep: true,
    alt: "Гишүүд сургуулийн гадаа чулуугаар хүрээлсэн мод тарих нүхний дэргэд",
    altEn: "Members beside a stone-lined tree pit outside the school",
  },
  "126ff047aad6": {
    keep: true,
    alt: "Гишүүд танхимд тойрон сууж, багийн тоглоом тоглож байна",
    altEn: "Members sitting in a circle in a hall, playing a team game",
  },
  "9769b5ea7b83": {
    keep: true,
    alt: "Сурагчид сургуулийн их танхимд гадаадад суралцах тухай илтгэл сонсож байна",
    altEn: "Students in the school assembly hall listening to a talk about studying abroad",
  },
  "1ca8ddd4894e": {
    keep: true,
    alt: "Гишүүд явган аяллын үеэр шинэсэн ойд хамтдаа зургаа авахуулж байна",
    altEn: "Members posing for a group photo in a larch forest during the hike",
    crop: { left: 12, top: 40, width: 1146, height: 870 },
    note: "Phone screenshot: the dark app bars (with app text) are cropped off.",
  },
  "762527962fe1": {
    keep: true,
    alt: "Гишүүд цастай ууланд халуун ундаа, жигнэмэг худалдаалж байна",
    altEn: "Members selling hot drinks and biscuits on a snowy mountain",
  },
  ca97a5201640: {
    keep: false,
    reason: "The handwritten price list shows a bank account number.",
  },
  eca629ae9d93: {
    keep: true,
    alt: "Волейболын тэмцээний өмнө тамирчид спорт заалд эгнэн зогсож байна",
    altEn: "Players lining up in the gym before the volleyball tournament",
  },
};
