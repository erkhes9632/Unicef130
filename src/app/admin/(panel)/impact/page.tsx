import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FormSection } from "@/components/admin/form";
import { ImpactNewYear } from "@/components/admin/impact-new-year";
import { ImpactYearForm, type ImpactFormRow } from "@/components/admin/impact-year-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getDb } from "@/db";
import { impactDirections, impactStats } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { formatNumber } from "@/lib/dates/format";
import { createImpactYear, deleteImpactYear, saveImpactYear } from "./actions";

export const metadata: Metadata = { title: "Жилийн үр дүн" };

const dirLabel: Record<string, string> = {
  activity: "Нөлөөлөл",
  education: "Боловсрол",
  charity: "Хандив",
  total: "Нийт",
};
const keyLabel = {
  activities: "үйл ажиллагаа",
  inPerson: "биечлэн",
  online: "онлайн",
  total: "нийт хүрсэн",
  donationAmount: "хандив",
} as const;

/** Arithmetic checks shown to the admin (never blocking: the report's numbers are official). */
function checks(rows: ImpactFormRow[]): string[] {
  const out: string[] = [];
  const total = rows.find((r) => r.direction === "total");
  const dirs = rows.filter((r) => r.direction !== "total");
  for (const r of rows) {
    if (r.inPerson + r.online !== r.total && r.total > 0) {
      out.push(
        `${dirLabel[r.direction]}: биечлэн + онлайн = ${formatNumber(r.inPerson + r.online)}, харин «нийт хүрсэн» = ${formatNumber(r.total)}.`,
      );
    }
  }
  if (total) {
    for (const key of ["activities", "inPerson", "online", "total", "donationAmount"] as const) {
      const sum = dirs.reduce((s, r) => s + r[key], 0);
      if (sum !== total[key]) {
        out.push(
          `Нийт мөрийн «${keyLabel[key]}» = ${formatNumber(total[key])}, чиглэлүүдийн нийлбэр = ${formatNumber(sum)}.`,
        );
      }
    }
  }
  return out;
}

export default async function AdminImpactPage() {
  await requireUser("admin");
  const db = await getDb();
  const all = await db.select().from(impactStats).orderBy(desc(impactStats.schoolYear));
  const years = [...new Set(all.map((r) => r.schoolYear))];

  return (
    <>
      <AdminPageHeader
        title="Жилийн үр дүн"
        description="«Үр дүн» хуудасны албан ёсны тоо (хичээлийн жил тутам). Шинэ жилийн тайланг энд нэмнэ — код өөрчлөх шаардлагагүй."
      />
      <div className="max-w-5xl space-y-6">
        <FormSection title="Хичээлийн жил нэмэх">
          <ImpactNewYear action={createImpactYear} />
        </FormSection>
        {years.map((year) => {
          const rows: ImpactFormRow[] = impactDirections.map((d) => {
            const r = all.find((x) => x.schoolYear === year && x.direction === d);
            return {
              direction: d,
              activities: r?.activities ?? 0,
              inPerson: r?.inPerson ?? 0,
              inPersonLabel: r?.inPersonLabel ?? "",
              online: r?.online ?? 0,
              total: r?.total ?? 0,
              donationAmount: r?.donationAmount ?? 0,
              notes: r?.notes ?? "",
            };
          });
          return (
            <section
              key={year}
              className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-6"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{year.replace("-", "–")}</h2>
                <ConfirmAction
                  action={deleteImpactYear.bind(null, year)}
                  description={`${year} оны бүх үр дүнгийн тоог устгах уу?`}
                />
              </div>
              <ImpactYearForm
                key={all.find((x) => x.schoolYear === year)?.updatedAt.getTime()}
                action={saveImpactYear.bind(null, year)}
                rows={rows}
                warnings={checks(rows)}
              />
            </section>
          );
        })}
      </div>
    </>
  );
}
