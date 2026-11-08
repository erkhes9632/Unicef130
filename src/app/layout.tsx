import type { Metadata } from "next";
import "./globals.css";

// Phase 1 replaces this with the real design system (fonts, theme, header/footer, i18n).
export const metadata: Metadata = {
  title: "130 UNICEF клуб",
  description: "130-р сургуулийн UNICEF клуб — хүүхдүүдэд туслах сайн дурын клуб.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
