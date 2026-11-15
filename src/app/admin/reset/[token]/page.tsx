import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/admin/auth-card";
import { SetPasswordForm } from "@/components/admin/set-password-form";
import { inspectAuthToken } from "@/lib/auth/token-store";
import { completePasswordReset } from "../../token-actions";

export const metadata: Metadata = {
  title: "Нууц үг сэргээх",
  robots: { index: false, follow: false },
};

export default async function ResetPage({ params }: PageProps<"/admin/reset/[token]">) {
  const { token } = await params;
  const { state, row } = await inspectAuthToken("reset", token);

  if (state !== "valid" || !row) {
    return (
      <AuthCard
        title="Холбоос хүчингүй"
        description="Энэ холбоосын хугацаа дууссан эсвэл аль хэдийн ашиглагдсан байна. Клубын админаас шинэ холбоос авна уу."
        footer={<Link href="/admin/login">Нэвтрэх хуудас руу</Link>}
      >
        <span />
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Шинэ нууц үг" description={`${row.email} бүртгэлийн нууц үгийг шинэчилнэ.`}>
      <SetPasswordForm
        action={completePasswordReset.bind(null, token)}
        askName={false}
        submitLabel="Нууц үг хадгалах"
      />
    </AuthCard>
  );
}
