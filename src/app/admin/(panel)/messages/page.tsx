import { desc, isNotNull, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { MessageReadToggle } from "@/components/admin/message-read-toggle";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { cn } from "@/lib/utils";
import { deleteMessage, setMessageRead } from "./actions";

export const metadata: Metadata = { title: "Зурвасууд" };

export default async function AdminMessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const me = await requireUser();
  const sp = await searchParams;
  const filter = sp.filter === "unread" || sp.filter === "read" ? sp.filter : "all";
  const db = await getDb();
  const rows = await db
    .select()
    .from(contactMessages)
    .where(
      filter === "unread"
        ? isNull(contactMessages.readAt)
        : filter === "read"
          ? isNotNull(contactMessages.readAt)
          : undefined,
    )
    .orderBy(desc(contactMessages.createdAt))
    .limit(300);

  return (
    <>
      <AdminPageHeader title="Холбоо барих зурвасууд" />
      <div className="mb-4 flex gap-2">
        {(
          [
            ["all", "Бүгд"],
            ["unread", "Уншаагүй"],
            ["read", "Уншсан"],
          ] as const
        ).map(([v, label]) => (
          <Link
            key={v}
            href={v === "all" ? "/admin/messages" : `/admin/messages?filter=${v}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-border",
              filter === v && "bg-brand-cyan text-brand-night ring-brand-cyan",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
          Зурвас алга.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li
              key={m.id}
              className={cn(
                "space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border",
                !m.readAt && "ring-2 ring-brand-cyan",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {m.name} {!m.readAt && <Badge>Шинэ</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "130 UNICEF клуб"}`)}`}
                      className="hover:text-foreground"
                    >
                      {m.email}
                    </a>{" "}
                    · {formatDate("mn", m.createdAt, "long")}{" "}
                    {formatDate("mn", m.createdAt, "time")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <MessageReadToggle
                    read={Boolean(m.readAt)}
                    action={setMessageRead.bind(null, m.id)}
                  />
                  {me.role === "admin" && (
                    <ConfirmAction
                      action={deleteMessage.bind(null, m.id)}
                      description="Энэ зурвасыг устгах уу?"
                    />
                  )}
                </div>
              </div>
              {m.subject && <p className="font-semibold">{m.subject}</p>}
              <p className="text-sm whitespace-pre-line">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
