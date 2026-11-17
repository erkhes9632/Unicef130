import { ClerkShell } from "@/components/auth/clerk-shell";
import { resolveLocale } from "@/i18n/locale";

/** Clerk is loaded only in the account areas (see components/auth/clerk-shell.tsx). */
export default async function ClerkAreaLayout({
  children,
  params,
}: LayoutProps<"/[locale]/sign-out">) {
  return <ClerkShell locale={await resolveLocale(params)}>{children}</ClerkShell>;
}
