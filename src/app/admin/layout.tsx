import type { Metadata, Viewport } from "next";
import { ClerkShell } from "@/components/auth/clerk-shell";
import { RootDocument, rootIcons, rootViewport } from "@/components/layout/root-document";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "UNICEF 130 — Админ", template: "%s | UNICEF 130" },
  appleWebApp: { title: "UNICEF 130" },
  robots: { index: false, follow: false },
  icons: rootIcons,
};
export const viewport: Viewport = rootViewport;
// Every admin page is per user (session + role from D1): never prerendered or cached.
export const dynamic = "force-dynamic";

// Admin root (its own <html>, always dynamic). Mongolian-only; strings live inline.
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RootDocument lang="mn">
      <ClerkShell locale="mn">
        <div className="flex min-h-full flex-1 flex-col bg-muted/30">{children}</div>
      </ClerkShell>
    </RootDocument>
  );
}
