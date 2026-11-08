import type { Metadata } from "next";
import { EventForm } from "@/components/admin/event-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth/session";
import { saveEvent } from "../actions";

export const metadata: Metadata = { title: "Шинэ арга хэмжээ" };

export default async function NewEventPage() {
  await requireUser();
  return (
    <>
      <AdminPageHeader title="Шинэ арга хэмжээ" />
      <EventForm action={saveEvent.bind(null, null)} />
    </>
  );
}
