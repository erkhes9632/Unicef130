import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Сайтын тохиргоо" };

export default async function AdminSettingsPage() {
  await requireUser("admin");
  const initial = await getSiteSettings();
  return (
    <>
      <AdminPageHeader
        title="Сайтын тохиргоо"
        description="Холбоо барих, сошиал, нүүр хуудасны тоо, хандивын холбоос"
      />
      <SettingsForm action={saveSettings} initial={initial} />
    </>
  );
}
