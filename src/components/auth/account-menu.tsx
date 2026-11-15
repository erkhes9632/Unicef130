"use client";

import { Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { FileText, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AFTER_SIGN_IN_PATH, toRole } from "@/lib/auth/roles";

export type AccountMenuLabels = {
  signIn: string;
  admin: string;
  me: string;
  application: string;
};

/**
 * Header account control. Signed out: "Нэвтрэх" (Clerk modal). Signed in: the Clerk avatar menu
 * with links for the role — Админ (admins), Миний хэсэг (members and admins), Өргөдөл
 * (applicants) — and Гарах. Links only help navigation: every page checks the role itself.
 */
export function AccountMenu({
  labels,
  locale = "mn",
  compact = false,
}: {
  labels: AccountMenuLabels;
  locale?: "mn" | "en";
  compact?: boolean;
}) {
  const { sessionClaims } = useAuth();
  const role = toRole(sessionClaims?.role);
  const prefix = locale === "en" ? "/en" : "";

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal" fallbackRedirectUrl={`${AFTER_SIGN_IN_PATH}?locale=${locale}`}>
          <Button variant="outline" size={compact ? "icon" : "default"} className="ml-1">
            <LogIn aria-hidden="true" />
            <span className={compact ? "sr-only" : undefined}>{labels.signIn}</span>
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <span className="ml-1 inline-flex size-9 items-center justify-center">
          <UserButton>
            <UserButton.MenuItems>
              {role === "admin" && (
                <UserButton.Link
                  label={labels.admin}
                  labelIcon={<ShieldCheck className="size-4" />}
                  href="/admin"
                />
              )}
              {role && (
                <UserButton.Link
                  label={labels.me}
                  labelIcon={<UserRound className="size-4" />}
                  href={`${prefix}/me`}
                />
              )}
              {!role && (
                <UserButton.Link
                  label={labels.application}
                  labelIcon={<FileText className="size-4" />}
                  href={`${prefix}/join`}
                />
              )}
              <UserButton.Action label="manageAccount" />
              <UserButton.Action label="signOut" />
            </UserButton.MenuItems>
          </UserButton>
        </span>
      </Show>
    </>
  );
}
