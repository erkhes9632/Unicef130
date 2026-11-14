import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { toUbInputValue } from "@/lib/dates/ub-input";
import { saveEvent } from "../actions";

export const metadata: Metadata = { title: "Арга хэмжээ засах" };

export default async function EditEventPage({
  params,
  searchParams,
}: PageProps<"/admin/events/[id]">) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!row) notFound();

  return (
    <>
      <AdminPageHeader
        title="Арга хэмжээ засах"
        description={row.title}
        actions={
          row.published && (
            <Button asChild variant="outline">
              <Link href={`/events/${row.slug}`} target="_blank">
                <ExternalLink /> Сайт дээр харах
              </Link>
            </Button>
          )
        }
      />
      <EventForm
        key={row.updatedAt.getTime()}
        action={saveEvent.bind(null, row.id)}
        saved={sp.saved === "1"}
        initial={{
          title: row.title,
          titleEn: row.titleEn,
          slug: row.slug,
          summary: row.summary,
          summaryEn: row.summaryEn,
          location: row.location,
          locationEn: row.locationEn,
          coverUrl: row.coverUrl,
          startsAt: toUbInputValue(row.startsAt),
          endsAt: toUbInputValue(row.endsAt),
          content: row.content,
          contentEn: row.contentEn,
          published: row.published,
          allDay: row.allDay,
          direction: row.direction,
          schoolYear: row.schoolYear,
          reachInPerson: row.reachInPerson,
          reachInPersonEn: row.reachInPersonEn,
          reachOnline: row.reachOnline,
          donationAmount: row.donationAmount,
          partners: row.partners,
          beneficiaries: row.beneficiaries,
          sdgs: row.sdgs,
          adminNote: row.adminNote,
        }}
      />
    </>
  );
}
