"use client";

import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { RoleHint } from "@/lib/auth/role-hint";
import { useHeaderSession } from "./use-header-session";

export type CtaLabels = { join: string; me: string; admin: string };
export type CtaKind = "join" | "me" | "admin";

export function ctaKind(signedIn: boolean, role: RoleHint | null): CtaKind {
  if (!signedIn) return "join";
  return role === "admin" ? "admin" : role === "member" ? "me" : "join";
}

/**
 * The one call-to-action in the header, by role (display only — every page checks access
 * itself): visitors and applicants «Гишүүн болох», members «Миний хэсэг», admins «Админ».
 */
export function HeaderCta({ labels, className }: { labels: CtaLabels; className?: string }) {
  const { signedIn, role } = useHeaderSession();
  const kind = ctaKind(signedIn, role);
  if (kind === "admin")
    return (
      <Button asChild variant="outline" className={className}>
        {/* A full page load: /admin needs the account-area CSP (see lib/auth/account-paths.ts). */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional full page load */}
        <a href="/admin">
          <ShieldCheck aria-hidden="true" />
          {labels.admin}
        </a>
      </Button>
    );
  return (
    <Button asChild variant={kind === "me" ? "outline" : "default"} className={className}>
      <Link href={kind === "me" ? "/me" : "/join"}>
        {kind === "me" && <UserRound aria-hidden="true" />}
        {kind === "me" ? labels.me : labels.join}
        {kind === "join" && <ArrowRight aria-hidden="true" />}
      </Link>
    </Button>
  );
}
