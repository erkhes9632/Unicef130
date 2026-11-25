import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SupportPageForm } from "@/components/admin/support-page-form";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import { saveSupportPage } from "../../settings/actions";

export const metadata: Metadata = { title: "«Дэмжих» хуудас" };

export default async function AdminSupportPage() {
  await requireAdmin();
  const { support } = await getSiteSettings();
  return (
    <>
      <AdminPageHeader
        title="«Дэмжих» хуудас"
        description="«Биднийг хэрхэн дэмжих вэ?» хуудасны текст. Зөвхөн клубын үнэхээр хийдэг зүйлийг бичнэ үү. Холбоо барих и-мэйл, Instagram-ыг «Сайтын тохиргоо»-ноос засна."
      />
      <SupportPageForm action={saveSupportPage} initial={support} />
    </>
  );
}
