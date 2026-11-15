import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/admin/auth-card";
import { SetPasswordForm } from "@/components/admin/set-password-form";
import { isRole, roleLabels } from "@/lib/auth/roles";
import { inspectAuthToken } from "@/lib/auth/token-store";
import { acceptInvite } from "../../token-actions";

export const metadata: Metadata = { title: "Урилга", robots: { index: false, follow: false } };

export default async function InvitePage({ params }: PageProps<"/admin/invite/[token]">) {
  const { token } = await params;
  const { state, row } = await inspectAuthToken("invite", token);

  if (state !== "valid" || !row || !isRole(row.role)) {
    return (
      <AuthCard
        title="Урилга хүчингүй"
        description="Энэ холбоосын хугацаа дууссан эсвэл аль хэдийн ашиглагдсан байна. Клубын админаас шинэ урилга авна уу."
        footer={<Link href="/admin/login">Нэвтрэх хуудас руу</Link>}
      >
        <span />
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Админ хэсэгт тавтай морил"
      description={`${row.email} хаягийг «${roleLabels[row.role]}» эрхээр урьсан байна. Нэр, нууц үгээ тохируулна уу.`}
    >
      <SetPasswordForm
        action={acceptInvite.bind(null, token)}
        askName
        submitLabel="Бүртгэлээ үүсгэх"
      />
    </AuthCard>
  );
}
