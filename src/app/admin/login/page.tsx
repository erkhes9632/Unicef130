import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/auth-card";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Нэвтрэх" };

const notices: Record<string, string> = {
  welcome: "Бүртгэл үүслээ. Шинэ нууц үгээрээ нэвтэрнэ үү.",
  reset: "Нууц үг шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.",
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getCurrentUser()) redirect("/admin");
  const sp = await searchParams;
  const notice = Object.keys(notices).find((k) => sp[k] === "1");

  return (
    <AuthCard
      title="Админ хэсэг"
      description="Клубын удирдлагад зориулсан нэвтрэх хэсэг"
      footer="Нэвтрэх эрхгүй бол клубын админаас урилга авна уу."
    >
      {notice && (
        <p role="status" className="rounded-xl bg-brand-green-soft p-3 text-sm font-medium">
          {notices[notice]}
        </p>
      )}
      <LoginForm />
    </AuthCard>
  );
}
