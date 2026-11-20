import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Shown by the /admin layout to a signed-in account without the admin role (instead of a silent
 * redirect). The role was already re-checked against Clerk, so "sign out and in again" is only
 * the fallback for a browser that still holds an old session.
 */
export function AdminForbidden({
  user,
}: {
  user: { email: string; role: "admin" | "member" | null };
}) {
  return (
    <main
      id="main"
      className="container-page flex flex-1 flex-col items-center justify-center py-16 text-center"
    >
      <div className="max-w-lg space-y-5">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-gold-soft text-brand-gold-strong">
          <ShieldAlert className="size-7" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-extrabold">Танд админ эрх байхгүй</h1>
        <p className="text-muted-foreground">
          Та <strong className="text-foreground">{user.email || "энэ бүртгэлээр"}</strong> хаягаар
          нэвтэрсэн байна. Админ хэсэг зөвхөн клубын админуудад нээлттэй.
        </p>
        <div className="space-y-2 rounded-2xl bg-card p-5 text-left text-sm ring-1 ring-border">
          <p className="font-semibold">Админ байх ёстой юу?</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Өөр и-мэйлээр нэвтэрсэн эсэхээ шалгаарай.</li>
            <li>
              Эрхийг одоогийн админ «Хэрэглэгчид» хэсгээс олгоно (анхны админыг төсөл хариуцагч
              терминалаас олгоно).
            </li>
            <li>Эрх саяхан олгогдсон бол гараад дахин нэвтэрнэ үү.</li>
          </ul>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href={user.role ? "/me" : "/join"}>
              <ArrowLeft aria-hidden="true" />
              {user.role ? "Миний хэсэг" : "Сайт руу буцах"}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sign-out?next=sign-in" prefetch={false}>
              <LogOut aria-hidden="true" />
              Гараад дахин нэвтрэх
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
