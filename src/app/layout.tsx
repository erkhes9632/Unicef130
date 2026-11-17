import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { getSiteSettings, safeImageUrl } from "@/lib/data/settings";
import { getSiteUrl } from "@/lib/seo";
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

/**
 * Root layout shared by the public site ([locale]) and /admin. Clerk is not loaded here: only the
 * account areas wrap themselves in `ClerkShell` (components/auth/clerk-shell.tsx).
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(fontDisplay.variable, fontBody.variable, "h-full antialiased")}
    >
      <body className="flex min-h-full flex-col overflow-x-clip">
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster
            richColors
            position="top-center"
            customAriaLabel={locale === "en" ? "Notifications" : "Мэдэгдлүүд"}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
