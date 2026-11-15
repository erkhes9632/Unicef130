import { getDb } from "@/db";
import { recruitmentPeriods, users } from "@/db/schema";
import { helpOptionLabels } from "@/lib/admin/labels";
import { getCurrentUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { getSiteSettings } from "@/lib/data/settings";
import { formatDate } from "@/lib/dates/format";
import { parseApplicationFilters, queryApplications } from "@/lib/recruitment/admin-query";
import { applicationStatusLabels } from "@/lib/recruitment/logic";

/**
 * CSV export of join applications with the same filters as the list (UTF-8 with BOM so Excel
 * shows Cyrillic correctly; cells are guarded against spreadsheet formula injection in toCsv).
 */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  if (me.role !== "admin") return new Response("Forbidden", { status: 403 });

  const filters = parseApplicationFilters(new URL(request.url).searchParams);
  const db = await getDb();
  const [rows, periods, staff, settings] = await Promise.all([
    queryApplications(filters),
    db.select().from(recruitmentPeriods),
    db.select({ id: users.id, name: users.name }).from(users),
    getSiteSettings(),
  ]);
  const helpLabel = helpOptionLabels(settings.helpOptions);
  const periodName = new Map(periods.map((p) => [p.id, p.name]));
  const staffName = new Map(staff.map((u) => [u.id, u.name]));
  const questionLabel = new Map(
    periods.flatMap((p) => p.questions.map((q) => [q.id, q.label] as const)),
  );

  const csv = toCsv([
    [
      "Огноо",
      "Элсэлт",
      "Овог нэр",
      "Анги",
      "Утас",
      "И-мэйл",
      "Шалтгаан",
      "Туслах чиглэл",
      "Нэмэлт хариулт",
      "Төлөв",
      "Шийдвэрлэсэн",
      "Өргөдөл гаргагчид өгсөн мессеж",
      "Тэмдэглэл",
      "ID",
    ],
    ...rows.map((a) => [
      `${formatDate("mn", a.createdAt, "long")} ${formatDate("mn", a.createdAt, "time")}`,
      a.periodId ? (periodName.get(a.periodId) ?? "") : "",
      a.fullName,
      a.className,
      a.phone,
      a.email ?? "",
      a.reason,
      a.helpWith.map((h) => helpLabel[h] ?? h).join(", "),
      Object.entries(a.answers)
        .map(
          ([k, v]) =>
            `${questionLabel.get(k) ?? k}: ${typeof v === "boolean" ? (v ? "Тийм" : "Үгүй") : v}`,
        )
        .join("; "),
      applicationStatusLabels[a.status],
      a.decidedBy ? (staffName.get(a.decidedBy) ?? "") : "",
      a.decisionMessage,
      a.notes,
      a.id,
    ]),
  ]);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="applications-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
