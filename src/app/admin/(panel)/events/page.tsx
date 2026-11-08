import { desc } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { nowMs } from "@/lib/dates/ub-time";
import { deleteEvent } from "./actions";

export const metadata: Metadata = { title: "Арга хэмжээ" };

export default async function AdminEventsPage() {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      location: events.location,
      published: events.published,
    })
    .from(events)
    .orderBy(desc(events.startsAt))
    .limit(300);
  const now = nowMs();

  return (
    <>
      <AdminPageHeader
        title="Арга хэмжээ"
        actions={
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus /> Шинэ арга хэмжээ
            </Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
          Арга хэмжээ алга.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/events/${r.id}`}
                  className="line-clamp-1 font-semibold hover:text-brand-cyan-strong"
                >
                  {r.title}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={r.published ? "default" : "secondary"}>
                    {r.published ? "Нийтлэгдсэн" : "Ноорог"}
                  </Badge>
                  {r.startsAt.getTime() < now && <Badge variant="outline">Өнгөрсөн</Badge>}
                  <span>
                    {formatDate("mn", r.startsAt, "long")} {formatDate("mn", r.startsAt, "time")}
                  </span>
                  <span className="truncate">{r.location}</span>
                </p>
              </div>
              <Button asChild variant="ghost" size="icon-sm" aria-label="Засах">
                <Link href={`/admin/events/${r.id}`}>
                  <Pencil />
                </Link>
              </Button>
              <ConfirmAction
                action={deleteEvent.bind(null, r.id)}
                description={`«${r.title}» арга хэмжээг устгах уу?`}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
