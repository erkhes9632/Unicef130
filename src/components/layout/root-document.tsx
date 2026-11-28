import type { Metadata, Viewport } from "next";
import { fontBody, fontDisplay } from "@/app/fonts";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { MEMBER_HINT_SCRIPT } from "@/lib/auth/role-hint";
import { cn } from "@/lib/utils";

/**
 * The <html> shell shared by the two root layouts: app/[locale] (public site, cached HTML) and
 * app/admin. It reads no request data, so public pages stay static. The toast area lives in the
 * account areas only (`ClerkShell`): public pages ship no toast code.
 */
export function RootDocument({ lang, children }: { lang: "mn" | "en"; children: React.ReactNode }) {
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={cn(fontDisplay.variable, fontBody.variable, "h-full antialiased")}
    >
      {/* App Router root layout: a plain <head> is the documented way (no next/head). */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        {/* Before the first paint: hides «Гишүүн болох» for members (no layout shift). */}
        <script dangerouslySetInnerHTML={{ __html: MEMBER_HINT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

/** Logo kit icons (public/brand/): SVG favicon, 32 px PNG fallback, 180 px apple-touch-icon. */
export const rootIcons: Metadata["icons"] = {
  icon: [
    { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    { url: "/brand/favicon.svg", type: "image/svg+xml" },
  ],
  apple: [{ url: "/brand/favicon-180.png", sizes: "180x180", type: "image/png" }],
};

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFBF5" },
    { media: "(prefers-color-scheme: dark)", color: "#17181C" },
  ],
};
