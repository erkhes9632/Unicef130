import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { baseClientNamespaces } from "@/i18n/client-namespaces";

/**
 * Adds message namespaces for the client components below it (a nested provider replaces the
 * messages, so the base namespaces are included again). Keeps big namespaces like "Forms" out of
 * every cached page.
 */
export async function ClientMessages({
  namespaces,
  children,
}: {
  namespaces: readonly string[];
  children: React.ReactNode;
}) {
  const messages = (await getMessages()) as Record<string, unknown>;
  const pick = [...baseClientNamespaces, ...namespaces].filter((ns) => ns in messages);
  return (
    <NextIntlClientProvider messages={Object.fromEntries(pick.map((ns) => [ns, messages[ns]]))}>
      {children}
    </NextIntlClientProvider>
  );
}
