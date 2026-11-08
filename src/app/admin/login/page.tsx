import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Нэвтрэх" };

export default async function AdminLoginPage() {
  if (await getCurrentUser()) redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
        <div className="flex justify-center">
          <BrandLockup size={40} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">Админ хэсэг</h1>
          <p className="text-sm text-muted-foreground">Клубын удирдлагад зориулсан нэвтрэх хэсэг</p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-muted-foreground">
          Нэвтрэх эрхгүй бол клубын админд хандана уу.
        </p>
      </div>
    </main>
  );
}
