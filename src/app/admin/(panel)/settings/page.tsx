import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { nowMs } from "@/lib/dates/ub-time";
import { nextSchoolYear, previousSchoolYear, schoolYearOf, sortYearsDesc } from "@/lib/school-year";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Сайтын тохиргоо" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const initial = await getSiteSettings();
  const auto = schoolYearOf(nowMs());
  // Last year, this year, next year (a new year can be started a few days early).
  const options = sortYearsDesc([
    nextSchoolYear(auto),
    auto,
    previousSchoolYear(auto),
    initial.schoolYear.current,
  ]);
  return (
    <>
      <AdminPageHeader
        title="Сайтын тохиргоо"
        description="Клубын мэдээлэл, лого, холбоо барих, сошиал, тоон үзүүлэлт, хамтрагчид, хандив, маягтын сонголтууд, хичээлийн жил"
      />
      <SettingsForm action={saveSettings} initial={initial} schoolYear={{ auto, options }} />
    </>
  );
}
