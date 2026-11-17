import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { clerkPublishableKey, signInPathFor } from "@/lib/auth/clerk";
import { clerkAppearance, clerkLocalizationMn } from "@/lib/auth/clerk-ui";
import { AFTER_SIGN_IN_PATH } from "@/lib/auth/roles";

/**
 * Loads Clerk (provider + clerk-js from Clerk's CDN) only where an account UI is needed:
 * /sign-in, /sign-out, /join, /me and /admin. Public pages render the header account button on
 * the server (`HeaderAccount`), so anonymous visitors download no Clerk code. Without a key the
 * children render as they are (sign-in shows "unavailable").
 */
export async function ClerkShell({
  locale,
  children,
}: {
  locale: "mn" | "en";
  children: React.ReactNode;
}) {
  const publishableKey = clerkPublishableKey();
  if (!publishableKey) return children;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const home = locale === "en" ? "/en" : "/";
  const signInPath = signInPathFor(home);
  const afterSignIn = `${AFTER_SIGN_IN_PATH}?locale=${locale}`;
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      nonce={nonce}
      signInUrl={signInPath}
      signUpUrl={signInPath}
      signInFallbackRedirectUrl={afterSignIn}
      signUpFallbackRedirectUrl={afterSignIn}
      afterSignOutUrl={home}
      appearance={clerkAppearance}
      localization={locale === "en" ? undefined : clerkLocalizationMn}
      telemetry={false}
    >
      {children}
    </ClerkProvider>
  );
}
