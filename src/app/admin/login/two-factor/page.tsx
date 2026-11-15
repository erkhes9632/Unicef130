import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/auth-card";
import { getCurrentUser } from "@/lib/auth/session";
import { TwoFactorForm } from "./two-factor-form";

export const metadata: Metadata = { title: "Баталгаажуулах код" };

export default async function TwoFactorLoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <AuthCard
      title="Баталгаажуулах код"
      description="Authenticator апп дээрх 6 оронтой кодыг оруулна уу."
      footer={<Link href="/admin/login">Буцах</Link>}
    >
      <TwoFactorForm />
    </AuthCard>
  );
}
