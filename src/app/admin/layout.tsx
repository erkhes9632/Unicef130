import type { Metadata } from "next";
import { ClerkShell } from "@/components/auth/clerk-shell";

export const metadata: Metadata = {
  title: { default: "Админ хэсэг", template: "%s | Админ" },
  robots: { index: false, follow: false },
};

// The admin panel is Mongolian-only (spec §5); strings live inline in admin components.
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <ClerkShell locale="mn">
      <div className="flex min-h-full flex-1 flex-col bg-muted/30">{children}</div>
    </ClerkShell>
  );
}
