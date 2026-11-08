import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { NewsForm } from "@/components/admin/news-form";
import { requireUser } from "@/lib/auth/session";
import { saveNews } from "../actions";

export const metadata: Metadata = { title: "Шинэ мэдээ" };

export default async function NewNewsPage() {
  await requireUser();
  return (
    <>
      <AdminPageHeader title="Шинэ мэдээ" />
      <NewsForm action={saveNews.bind(null, null)} />
    </>
  );
}
