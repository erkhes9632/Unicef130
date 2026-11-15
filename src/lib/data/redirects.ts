import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { slugRedirects } from "@/db/schema";

export type RedirectKind = "news" | "events";

/** Current slug for an old one, following chains (a → b → c) up to a few hops. */
export async function findSlugRedirect(kind: RedirectKind, slug: string): Promise<string | null> {
  const db = await getDb();
  let current = slug;
  for (let hop = 0; hop < 5; hop++) {
    const [row] = await db
      .select({ to: slugRedirects.toSlug })
      .from(slugRedirects)
      .where(and(eq(slugRedirects.kind, kind), eq(slugRedirects.fromSlug, current)))
      .limit(1);
    if (!row || row.to === current) break;
    current = row.to;
  }
  return current === slug ? null : current;
}

/** Records old → new after a rename (and removes a redirect that would now shadow the new slug). */
export async function recordSlugRename(kind: RedirectKind, from: string, to: string) {
  if (!from || from === to) return;
  const db = await getDb();
  await db
    .delete(slugRedirects)
    .where(and(eq(slugRedirects.kind, kind), eq(slugRedirects.fromSlug, to)));
  await db
    .insert(slugRedirects)
    .values({ kind, fromSlug: from, toSlug: to })
    .onConflictDoUpdate({
      target: [slugRedirects.kind, slugRedirects.fromSlug],
      set: { toSlug: to },
    });
}
