import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { getSiteSettings } from "@/lib/data/settings";
import { yearSummary } from "@/lib/members/year-summary";

/** Yearly hours per member for the annual report (UTF-8 with BOM for Excel). Admin only. */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  if (me.role !== "admin") return new Response("Forbidden", { status: 403 });
  const year = new URL(request.url).searchParams.get("year") ?? "";
  if (!/^\d{4}-\d{4}$/.test(year)) return new Response("Bad year", { status: 400 });
  const settings = await getSiteSettings();
  const { listed, totalAll } = await yearSummary(
    await getDb(),
    year,
    settings.membership.activeMemberHours,
  );
  const csv = toCsv([
    ["Хичээлийн жил", "Нэр", "Анги", "Баг", "Тайлангаас", "Бүртгэсэн", "Нийт цаг", "Идэвхтэй"],
    ...listed.map((r) => [
      year,
      r.member.name,
      r.member.className,
      r.member.team,
      r.imported,
      r.logged,
      r.total,
      r.active ? "Тийм" : "",
    ]),
    [year, "Нийт (устгагдсан бүртгэлийн цагийг оруулаад)", "", "", "", "", totalAll, ""],
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="volunteer-hours-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
