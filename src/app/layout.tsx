import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { getSiteUrl } from "@/lib/seo";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { clerkPublishableKey, signInPathFor } from "@/lib/auth/clerk";
import { clerkAppearance, clerkLocalizationMn } from "@/lib/auth/clerk-ui";
import { AFTER_SIGN_IN_PATH } from "@/lib/auth/roles";
import { getSiteSettings, safeImageUrl } from "@/lib/data/settings";
import { cn } from "@/lib/utils";
import { fontBody, fontDisplay } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const logo = safeImageUrl(settings.branding.schoolLogoUrl);
  return {
    metadataBase: new URL(await getSiteUrl()),
    applicationName: settings.club.name || siteConfig.name,
    // An uploaded school logo replaces the generated favicon / app icon.
    ...(logo ? { icons: { icon: [{ url: logo }], apple: [{ url: logo }] } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

/** Root layout shared by the public site ([locale]) and /admin. */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const signInPath = signInPathFor(locale === "en" ? "/en" : "/");
  const afterSignIn = `${AFTER_SIGN_IN_PATH}?locale=${locale}`;
  // Without a Clerk key the site still renders (sign-in is unavailable until it is set).
  const publishableKey = clerkPublishableKey();
  const app = (
    <ThemeProvider nonce={nonce}>
      {children}
      <Toaster
        richColors
        position="top-center"
        customAriaLabel={locale === "en" ? "Notifications" : "Мэдэгдлүүд"}
      />
    </ThemeProvider>
  );

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(fontDisplay.variable, fontBody.variable, "h-full antialiased")}
    >
      <body className="flex min-h-full flex-col overflow-x-clip">
        {publishableKey ? (
          <ClerkProvider
            publishableKey={publishableKey}
            nonce={nonce}
            signInUrl={signInPath}
            signUpUrl={signInPath}
            signInFallbackRedirectUrl={afterSignIn}
            signUpFallbackRedirectUrl={afterSignIn}
            afterSignOutUrl={locale === "en" ? "/en" : "/"}
            appearance={clerkAppearance}
            localization={locale === "en" ? undefined : clerkLocalizationMn}
            telemetry={false}
          >
            {app}
          </ClerkProvider>
        ) : (
          app
        )}
      </body>
    </html>
  );
}
