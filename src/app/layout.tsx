import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { getSiteSettings } from "@/lib/data/settings";
import { getSiteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { fontBody, fontDisplay } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(await getSiteUrl()),
    applicationName: settings.club.name || siteConfig.name,
    // Logo kit (public/brand/): SVG favicon, 32 px PNG fallback, 180 px apple-touch-icon.
    // /favicon.ico (public/, built by `bun run brand:assets`) is only for clients that ask for it.
    icons: {
      icon: [
        { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/brand/favicon.svg", type: "image/svg+xml" },
      ],
      apple: [{ url: "/brand/favicon-180.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFBF5" },
    { media: "(prefers-color-scheme: dark)", color: "#17181C" },
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
