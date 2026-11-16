import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AttendanceControls, MarkAllAttended } from "@/components/admin/volunteer-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { events, type SignupStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { listEventSignups } from "@/lib/members/hours";
import { suggestedEventHours } from "@/lib/members/logic";
import { markAllAttended, markAttendance } from "../../actions";

export const metadata: Metadata = { title: "Сайн дурынхан" };

const statusLabel: Record<SignupStatus, string> = {
  registered: "Бүртгүүлсэн",
  waitlist: "Хүлээлгийн жагсаалт",
  cancelled: "Цуцалсан",
  attended: "Ирсэн",
  absent: "Ирээгүй",
};

/** Volunteers who signed up in /me, with attendance → hours log. */
export default async function EventVolunteersPage({
  params,
}: PageProps<"/admin/events/[id]/volunteers">) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) notFound();
  const rows = await listEventSignups(db, id);
  const suggested = suggestedEventHours(event);
  const count = (s: SignupStatus) => rows.filter((r) => r.status === s).length;

  return (
    <>
      <AdminPageHeader
        title="Сайн дурынхан"
        description={`${event.title} · ${formatDate("mn", event.startsAt, "long")}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/events/${id}`}>
              <ArrowLeft /> Арга хэмжээ рүү
            </Link>
          </Button>
        }
      />
      {!event.signupEnabled && (
        <p className="mb-4 rounded-xl bg-brand-gold-soft p-3 text-sm">
          Энэ арга хэмжээнд гишүүдийн бүртгэл нээгдээгүй байна (арга хэмжээ засах → «Сайн дурын
          бүртгэл»).
        </p>
      )}
      <p className="mb-4 text-sm text-muted-foreground">
        Бүртгүүлсэн {count("registered")} · Ирсэн {count("attended")} · Хүлээлгийн жагсаалт{" "}
        {count("waitlist")}
        {event.signupCapacity !== null && ` · Орон тоо ${event.signupCapacity}`}
      </p>
      {count("registered") > 0 && (
        <div className="mb-6">
          <MarkAllAttended suggested={suggested} action={markAllAttended.bind(null, id)} />
        </div>
      )}
      {rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          Одоогоор бүртгүүлсэн гишүүн алга.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {r.name}{" "}
                  {r.className && <span className="text-muted-foreground">· {r.className}</span>}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={r.status === "attended" ? "default" : "secondary"}>
                    {statusLabel[r.status]}
                  </Badge>
                  {r.hours !== null && <span>{r.hours} цаг бүртгэгдсэн</span>}
                  {!r.memberId && <span>гишүүний мөргүй</span>}
                </p>
              </div>
              <AttendanceControls
                status={r.status}
                hours={r.hours}
                suggested={suggested}
                canLogHours={!!r.memberId}
                mark={markAttendance.bind(null, id, r.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
