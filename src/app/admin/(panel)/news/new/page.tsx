import type { Metadata } from "next";
import { NewsForm } from "@/components/admin/news-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { listAlbumOptions } from "@/lib/data/gallery";
import { saveNews } from "../actions";

export const metadata: Metadata = { title: "Шинэ мэдээ" };

export default async function NewNewsPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        title="Шинэ мэдээ"
        description="Мэдээ бичээд «Ноорог» хэлбэрээр хадгалж болно; «Нийтлэх» сонговол сайтад гарна."
      />
      <NewsForm action={saveNews.bind(null, null)} albums={await listAlbumOptions()} />
    </>
  );
}
