import type { Metadata } from "next";
import { AlbumForm } from "@/components/admin/album-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth/session";
import { saveAlbum } from "../actions";

export const metadata: Metadata = { title: "Шинэ цомог" };

export default async function NewAlbumPage() {
  await requireUser();
  return (
    <>
      <AdminPageHeader
        title="Шинэ цомог"
        description="Цомгоо хадгалсны дараа зураг нэмэх боломжтой."
      />
      <div className="max-w-3xl">
        <AlbumForm action={saveAlbum.bind(null, null)} />
      </div>
    </>
  );
}
