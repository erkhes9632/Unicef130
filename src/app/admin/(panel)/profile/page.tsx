import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { FormSection } from "@/components/admin/form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ChangePasswordForm, SignOutOthersButton } from "@/components/admin/profile-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuth } from "@/lib/auth";
import { roleDescriptions, roleLabels } from "@/lib/auth/roles";
import { describeUserAgent } from "@/lib/auth/user-agent";
import { requireUser, TWO_FACTOR_SETUP_PATH } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates/format";
import { changeOwnPassword, signOutOtherDevices } from "./actions";

export const metadata: Metadata = { title: "Миний профайл" };

export default async function ProfilePage({ searchParams }: PageProps<"/admin/profile">) {
  const me = await requireUser(undefined, { allowWithoutTwoFactor: true });
  const justEnabled = (await searchParams).twoFactor === "on" && me.twoFactorEnabled;
  const auth = await getAuth();
  const sessions = (await auth.api.listSessions({ headers: await headers() })).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <>
      <AdminPageHeader title="Миний профайл" description={`${me.name} · ${me.email}`} />
      <div className="max-w-4xl space-y-6">
        {justEnabled && (
          <p role="status" className="rounded-xl bg-brand-green-soft p-3 text-sm font-medium">
            2 шатлалт баталгаажуулалт идэвхжлээ. Дараагийн нэвтрэлтээс эхлэн код асууна. Нөөц
            кодуудаа аюулгүй газар хадгалсан эсэхээ шалгаарай.
          </p>
        )}
        <FormSection title="Эрх">
          <p className="text-sm">
            <Badge>{roleLabels[me.role]}</Badge>{" "}
            <span className="text-muted-foreground">{roleDescriptions[me.role]}</span>
          </p>
        </FormSection>

        <FormSection
          title="2 шатлалт баталгаажуулалт (2FA)"
          description="Нууц үгээс гадна утасны authenticator апп-ын код шаардана. Нууц үг алдагдсан ч бүртгэл хамгаалагдана."
        >
          <div className="flex flex-wrap items-center gap-3">
            {me.twoFactorEnabled ? (
              <span className="inline-flex items-center gap-2 font-semibold text-brand-green-strong">
                <ShieldCheck className="size-5" aria-hidden="true" /> Идэвхтэй
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 font-semibold text-brand-gold-strong">
                <ShieldAlert className="size-5" aria-hidden="true" /> Тохируулаагүй
              </span>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={TWO_FACTOR_SETUP_PATH}>
                {me.twoFactorEnabled ? "Удирдах" : "Тохируулах"}
              </Link>
            </Button>
          </div>
        </FormSection>

        <FormSection
          title="Нууц үг солих"
          description="Солисны дараа бусад бүх төхөөрөмжөөс автоматаар гарна."
        >
          <ChangePasswordForm action={changeOwnPassword} />
        </FormSection>

        <FormSection
          title="Идэвхтэй төхөөрөмжүүд"
          description="Таны бүртгэлээр нэвтэрсэн байгаа төхөөрөмжүүд. Танихгүй төхөөрөмж байвал бусдаас гараад нууц үгээ солино уу."
        >
          <ul className="divide-y rounded-xl border text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <p className="font-semibold">
                    {describeUserAgent(s.userAgent)}{" "}
                    {s.id === me.sessionId && <Badge variant="secondary">Энэ төхөөрөмж</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress || "IP тодорхойгүй"} · нэвтэрсэн:{" "}
                    {formatDate("mn", s.createdAt, "long")} {formatDate("mn", s.createdAt, "time")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {sessions.length > 1 && <SignOutOthersButton action={signOutOtherDevices} />}
        </FormSection>
      </div>
    </>
  );
}
