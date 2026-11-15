import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PeriodForm } from "@/components/admin/period-form";
import { requireAdmin } from "@/lib/auth/session";
import { savePeriod } from "../actions";

export const metadata: Metadata = { title: "Элсэлт зарлах" };

export default async function NewPeriodPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        title="Элсэлт зарлах"
        description="Хугацаа эхлэхэд маягт автоматаар нээгдэж, дуусахад автоматаар хаагдана."
      />
      <PeriodForm action={savePeriod.bind(null, null)} />
    </>
  );
}
