/**
 * "Үйлдлийн түүх" in plain words (pure, unit-tested). Entries store ids only; here, on the
 * admin-only page, ids of members and of accounts that are members or admins become names.
 * Applicants stay numbers (their names never appear in the log, see logActivity).
 */

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  userId: string | null;
  createdAt: Date;
};

/** Names an admin may see: accounts with a role, and member records. */
export type AuditNames = {
  accounts: Map<string, { name: string; role: string | null }>;
  members: Map<string, string>;
};

const ACTION_TEXT: Record<string, string> = {
  "profile.two_factor_enable": "Хоёр шаттай баталгаажуулалт асаав",
  "profile.two_factor_disable": "Хоёр шаттай баталгаажуулалт унтраав",
  "settings.update": "Сайтын тохиргоог шинэчлэв",
  "user.profile_self": "Нэр, ангиа засав",
};

const ROLE_TEXT: Record<string, string> = {
  Админ: "админ болгов",
  Гишүүн: "гишүүн болгов",
  "Өргөдөл гаргагч": "эрхийг хасав",
};

/** "Solongo Orgil" → "Solongo Orgil-ийг" (object form, hyphenated so any script reads well). */
const object = (name: string) => `${name}-ийг`;

export function describeEntry(e: AuditEntry, names: AuditNames): string {
  const shortOf = (id: string) => id.slice(0, 8);
  let text = e.summary || ACTION_TEXT[e.action] || e.action;
  if (e.entityType === "user" && e.entityId) {
    const account = names.accounts.get(e.entityId);
    const visible = account && account.role && account.name.trim() ? account.name : null;
    const ref = `Бүртгэл #${shortOf(e.entityId)}`;
    if (visible && text.startsWith(ref)) {
      const rest = text.slice(ref.length).replace(/^\s*—\s*/, "");
      const role = /^эрх: (.+)$/.exec(rest)?.[1];
      if (role)
        text = ROLE_TEXT[role]
          ? role === "Өргөдөл гаргагч"
            ? `${visible}-ийн ${ROLE_TEXT[role]}`
            : `${object(visible)} ${ROLE_TEXT[role]}`
          : `${visible} — эрх: ${role}`;
      else if (rest === "идэвхгүй болгов" || rest === "идэвхжүүлэв")
        text = `${visible}-ийн бүртгэлийг ${rest}`;
      else text = rest ? `${visible} — ${rest}` : visible;
    }
  }
  if (e.entityType === "member" && e.entityId) {
    const name = names.members.get(e.entityId);
    const ref = `Гишүүн #${shortOf(e.entityId)}`;
    if (name && text.startsWith(ref)) text = `${name}${text.slice(ref.length)}`;
  }
  return text;
}

export type AuditGroup = {
  entry: AuditEntry;
  text: string;
  /** How many identical entries in a row (≥ 1) and their time span. */
  count: number;
  first: Date;
  last: Date;
};

/** Identical actions by the same person within this time count as one row. */
const GROUP_WINDOW_MS = 60 * 60_000;

/**
 * Groups runs of identical actions (same person, same action, same text, within an hour),
 * e.g. "5 гишүүнийг нийтэд харуулав (×5, 16:11–16:16)". Entries come newest first.
 */
export function groupEntries(entries: AuditEntry[], names: AuditNames): AuditGroup[] {
  const out: AuditGroup[] = [];
  for (const entry of entries) {
    const text = describeEntry(entry, names);
    const prev = out.at(-1);
    if (
      prev &&
      prev.entry.userId === entry.userId &&
      prev.entry.action === entry.action &&
      prev.text === text &&
      prev.last.getTime() - entry.createdAt.getTime() <= GROUP_WINDOW_MS
    ) {
      prev.count++;
      prev.first = entry.createdAt;
      continue;
    }
    out.push({ entry, text, count: 1, first: entry.createdAt, last: entry.createdAt });
  }
  return out;
}

/** Changed-field names in plain Mongolian (unknown fields keep their name). */
export const FIELD_LABELS: Record<string, string> = {
  title: "Гарчиг",
  titleEn: "Гарчиг (англи)",
  slug: "Хаяг (URL)",
  status: "Төлөв",
  published: "Нийтлэгдсэн",
  publishedAt: "Нийтэлсэн огноо",
  category: "Ангилал",
  sdgs: "Тогтвортой хөгжлийн зорилго",
  name: "Нэр",
  nameEn: "Нэр (англи)",
  role: "Үүрэг",
  className: "Анги",
  team: "Баг",
  showPublicly: "Нийтэд харуулах",
  showPhoto: "Зургийг харуулах",
  startsAt: "Эхлэх цаг",
  endsAt: "Дуусах цаг",
  location: "Байршил",
  capacity: "Хүний тоо",
  date: "Огноо",
  question: "Асуулт",
  answer: "Хариулт",
  sortOrder: "Дараалал",
};
