import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import { fontBody, fontDisplay } from "./fonts";
import "./globals.css";

// 404 for URLs outside the public site (unknown /admin, /api, /auth paths). Public URLs render
// app/[locale]/not-found.tsx with the site header and footer instead.
export const metadata: Metadata = { title: "404 — 130-р сургуулийн UNICEF клуб" };

export default function GlobalNotFound() {
  return (
    <html lang="mn" className={cn(fontDisplay.variable, fontBody.variable, "h-full")}>
      <body className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <BrandLogo
          variant="mark"
          locale="mn"
          alt="130-р сургуулийн UNICEF клуб"
          height={120}
          tone="light"
        />
        <h1 className="text-3xl font-extrabold">Хуудас олдсонгүй</h1>
        <p className="text-muted-foreground" lang="en">
          Page not found.
        </p>
        <Link href="/" className="font-semibold text-brand-cyan-strong underline">
          Нүүр хуудас руу буцах
        </Link>
      </body>
    </html>
  );
}
