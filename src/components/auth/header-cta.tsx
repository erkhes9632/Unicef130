import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getHeaderSession } from "@/lib/auth/header-session";

export type HeaderCtaTarget =
  | { kind: "join"; href: "/join"; label: string }
  | { kind: "me"; href: "/me"; label: string }
  | { kind: "admin"; href: "/admin"; label: string };

/**
 * The one call-to-action in the header, by role (display only — every page checks access
 * itself): visitors and applicants «Гишүүн болох», members «Миний хэсэг», admins «Админ».
 */
export async function headerCtaTarget(): Promise<HeaderCtaTarget> {
  const [session, t] = await Promise.all([getHeaderSession(), getTranslations()]);
  if (session?.role === "admin")
    return { kind: "admin", href: "/admin", label: t("Auth.adminButton") };
  if (session?.role === "member") return { kind: "me", href: "/me", label: t("Auth.menuMe") };
  return { kind: "join", href: "/join", label: t("Common.joinCta") };
}

export async function HeaderCta({ className }: { className?: string }) {
  const cta = await headerCtaTarget();
  if (cta.kind === "admin")
    return (
      <Button asChild variant="outline" className={className}>
        <NextLink href="/admin" prefetch={false}>
          <ShieldCheck aria-hidden="true" />
          {cta.label}
        </NextLink>
      </Button>
    );
  return (
    <Button asChild variant={cta.kind === "me" ? "outline" : "default"} className={className}>
      <Link href={cta.href}>
        {cta.kind === "me" && <UserRound aria-hidden="true" />}
        {cta.label}
        {cta.kind === "join" && <ArrowRight aria-hidden="true" />}
      </Link>
    </Button>
  );
}
