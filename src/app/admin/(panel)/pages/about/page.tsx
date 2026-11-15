import type { Metadata } from "next";
import { AboutPageForm } from "@/components/admin/about-page-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { saveAboutPage } from "../../settings/actions";

export const metadata: Metadata = { title: "Бидний тухай хуудас" };

export default async function AdminAboutPage() {
  await requireAdmin();
  const { about } = await getSiteSettings();
  return (
    <>
      <AdminPageHeader
        title="«Бидний тухай» хуудас"
        description="Танилцуулга, түүх, эрхэм зорилго, үнэт зүйлс, хийдэг ажлууд. Удирдлагын хэсэг нь Гишүүд → «Удирдлага» бүлгээс автоматаар гарна."
      />
      <AboutPageForm action={saveAboutPage} initial={about} />
    </>
  );
}
