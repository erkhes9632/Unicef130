import type { Metadata } from "next";
import { AlbumForm } from "@/components/admin/album-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { listEventOptions } from "@/lib/data/event-options";
import { saveAlbum } from "../actions";

export const metadata: Metadata = { title: "Шинэ цомог" };

export default async function NewAlbumPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        title="Шинэ цомог"
        description="Цомгоо хадгалсны дараа зураг нэмэх боломжтой."
      />
      <div className="max-w-3xl">
        <AlbumForm action={saveAlbum.bind(null, null)} events={await listEventOptions()} />
      </div>
    </>
  );
}
