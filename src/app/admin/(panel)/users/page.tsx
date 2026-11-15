import { and, asc, count, gt, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { InviteUserForm, PendingLinkRow, UserRowActions } from "@/components/admin/users-client";
import { getDb } from "@/db";
import { authTokens, session, user } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import {
  createResetLink,
  inviteUser,
  resetUserTwoFactor,
  revokeInvite,
  revokeUserSessions,
  setUserDisabled,
  setUserRole,
} from "./actions";

export const metadata: Metadata = { title: "Хэрэглэгчид" };

export default async function AdminUsersPage() {
  const me = await requireUser("admin");
  const db = await getDb();
  const now = new Date();
  const [rows, sessions, pending] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        twoFactorEnabled: user.twoFactorEnabled,
      })
      .from(user)
      .orderBy(asc(user.createdAt)),
    db
      .select({ userId: session.userId, n: count() })
      .from(session)
      .where(gt(session.expiresAt, now))
      .groupBy(session.userId),
    db
      .select({
        id: authTokens.id,
        kind: authTokens.kind,
        email: authTokens.email,
        role: authTokens.role,
        expiresAt: authTokens.expiresAt,
      })
      .from(authTokens)
      .where(and(isNull(authTokens.usedAt), gt(authTokens.expiresAt, now)))
      .orderBy(asc(authTokens.expiresAt)),
  ]);
  const sessionCount = new Map(sessions.map((s) => [s.userId, s.n]));

  return (
    <>
      <AdminPageHeader
        title="Хэрэглэгчид"
        description="Админ: бүх эрх. Редактор: мэдээ, арга хэмжээ, цомог, гишүүд. Өргөдөл хянагч: зөвхөн өргөдлүүд."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <ul className="h-fit divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {rows.map((r) => (
              <UserRowActions
                key={r.id}
                row={{ ...r, sessions: sessionCount.get(r.id) ?? 0 }}
                isSelf={r.id === me.id}
                setRole={setUserRole.bind(null, r.id)}
                setDisabled={setUserDisabled.bind(null, r.id)}
                createResetLink={createResetLink.bind(null, r.id)}
                revokeSessions={revokeUserSessions.bind(null, r.id)}
                resetTwoFactor={resetUserTwoFactor.bind(null, r.id)}
              />
            ))}
          </ul>
          {pending.length > 0 && (
            <section aria-labelledby="pending-links">
              <h2 id="pending-links" className="mb-2 font-bold">
                Хүлээгдэж буй холбоосууд
              </h2>
              <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                {pending.map((p) => (
                  <PendingLinkRow
                    key={p.id}
                    link={{
                      id: p.id,
                      kind: p.kind,
                      email: p.email,
                      role: p.role,
                      expiresLabel: `${formatDate("mn", p.expiresAt, "long")} ${formatDate("mn", p.expiresAt, "time")}`,
                    }}
                    revoke={revokeInvite.bind(null, p.id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
        <InviteUserForm action={inviteUser} />
      </div>
    </>
  );
}
