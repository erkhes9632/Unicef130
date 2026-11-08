import type { Metadata, Viewport } from "next";
import { getLocale } from "next-intl/server";
import { getSiteUrl } from "@/lib/seo";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { fontBody, fontDisplay } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getSiteUrl()),
    applicationName: siteConfig.name,
    icons: { icon: "/favicon.ico" },
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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(fontDisplay.variable, fontBody.variable, "h-full antialiased")}
    >
      <body className="flex min-h-full flex-col overflow-x-clip">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
