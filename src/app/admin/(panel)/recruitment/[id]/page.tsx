import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PeriodForm } from "@/components/admin/period-form";
import { getDb } from "@/db";
import { recruitmentPeriods } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { toUbInputValue } from "@/lib/dates/ub-input";
import { savePeriod } from "../actions";

export const metadata: Metadata = { title: "Элсэлт засах" };

export default async function EditPeriodPage({ params }: PageProps<"/admin/recruitment/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const [p] = await db
    .select()
    .from(recruitmentPeriods)
    .where(eq(recruitmentPeriods.id, id))
    .limit(1);
  if (!p) notFound();
  return (
    <>
      <AdminPageHeader title="Элсэлт засах" description={p.name} />
      <PeriodForm
        key={p.updatedAt.getTime()}
        action={savePeriod.bind(null, p.id)}
        initial={{
          ...p,
          opensAt: toUbInputValue(p.opensAt),
          closesAt: toUbInputValue(p.closesAt),
        }}
      />
    </>
  );
}
