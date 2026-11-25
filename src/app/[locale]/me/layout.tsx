import { ClerkShell } from "@/components/auth/clerk-shell";
import { ClientMessages } from "@/components/providers/client-messages";
import { memberNamespaces } from "@/i18n/client-namespaces";
import { resolveLocale } from "@/i18n/locale";

/** Clerk is loaded only in the account areas (see components/auth/clerk-shell.tsx). */
export default async function ClerkAreaLayout({ children, params }: LayoutProps<"/[locale]/me">) {
  return (
    <ClerkShell locale={await resolveLocale(params)}>
      <ClientMessages namespaces={memberNamespaces}>{children}</ClientMessages>
    </ClerkShell>
  );
}
