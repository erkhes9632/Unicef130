import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, applicationStatuses, type ApplicationStatus } from "@/db/schema";
import { applicationStatusLabel, helpOptionLabel } from "@/lib/admin/labels";
import { getCurrentUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/dates/format";

/** CSV export of join applications (UTF-8 with BOM so Excel shows Cyrillic correctly). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const statusParam = new URL(request.url).searchParams.get("status");
  const status = applicationStatuses.includes(statusParam as ApplicationStatus)
    ? (statusParam as ApplicationStatus)
    : undefined;
  const db = await getDb();
  const rows = await db
    .select()
    .from(applications)
    .where(status ? eq(applications.status, status) : undefined)
    .orderBy(desc(applications.createdAt));

  const csv = toCsv([
    [
      "Огноо",
      "Овог нэр",
      "Анги",
      "Утас",
      "И-мэйл",
      "Шалтгаан",
      "Туслах чиглэл",
      "Төлөв",
      "Тэмдэглэл",
      "Sheets",
      "ID",
    ],
    ...rows.map((a) => [
      `${formatDate("mn", a.createdAt, "long")} ${formatDate("mn", a.createdAt, "time")}`,
      a.fullName,
      a.className,
      a.phone,
      a.email ?? "",
      a.reason,
      a.helpWith.map((h) => helpOptionLabel[h] ?? h).join(", "),
      applicationStatusLabel[a.status],
      a.notes,
      a.sheetsSyncedAt ? "тийм" : "үгүй",
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
