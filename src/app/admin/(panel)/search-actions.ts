"use server";

import { desc, like, or } from "drizzle-orm";
import { getDb } from "@/db";
import { albums, events, members, news, users } from "@/db/schema";
import { assertAdmin } from "@/lib/auth/session";

export type AdminSearchHit = { href: string; label: string; kind: string };

/**
 * Quick search for the admin command palette (⌘K): titles of news, events, albums, member names
 * and account e-mails. Admin only; at most 5 hits per kind.
 */
export async function adminSearch(query: string): Promise<AdminSearchHit[]> {
  await assertAdmin();
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];
  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const db = await getDb();
  const [n, e, a, m, u] = await Promise.all([
    db
      .select({ id: news.id, t: news.title })
      .from(news)
      .where(like(news.title, pattern))
      .orderBy(desc(news.updatedAt))
      .limit(5),
    db
      .select({ id: events.id, t: events.title })
      .from(events)
      .where(like(events.title, pattern))
      .orderBy(desc(events.startsAt))
      .limit(5),
    db
      .select({ id: albums.id, t: albums.title })
      .from(albums)
      .where(like(albums.title, pattern))
      .limit(5),
    db
      .select({ id: members.id, t: members.name })
      .from(members)
      .where(like(members.name, pattern))
      .limit(5),
    db
      .select({ id: users.id, t: users.email, name: users.name })
      .from(users)
      .where(or(like(users.email, pattern), like(users.name, pattern)))
      .limit(5),
  ]);
  return [
    ...n.map((r) => ({ href: `/admin/news/${r.id}`, label: r.t, kind: "Мэдээ" })),
    ...e.map((r) => ({ href: `/admin/events/${r.id}`, label: r.t, kind: "Арга хэмжээ" })),
    ...a.map((r) => ({ href: `/admin/gallery/${r.id}`, label: r.t, kind: "Цомог" })),
    ...m.map((r) => ({ href: `/admin/members/${r.id}`, label: r.t, kind: "Гишүүн" })),
    ...u.map((r) => ({
      href: `/admin/users?q=${encodeURIComponent(r.t)}`,
      label: r.name ? `${r.name} (${r.t})` : r.t,
      kind: "Хэрэглэгч",
    })),
  ];
}
