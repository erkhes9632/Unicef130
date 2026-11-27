"use client";

import { Menu } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { CtaLabels } from "@/components/auth/header-cta";
import { Button } from "@/components/ui/button";
import { usePathname } from "@/i18n/navigation";

const loadDrawer = () => import("./mobile-nav-drawer").then((m) => m.MobileNavDrawer);
const MobileNavDrawer = dynamic(loadDrawer, { ssr: false });

/**
 * Menu button below `xl`. The drawer (grouped links, role button, search, language, theme) is
 * fetched on first use — warmed up when a finger or pointer reaches the button — and closes
 * on every route change.
 */
export function MobileNav({ labels, showFaq }: { labels: CtaLabels; showFaq: boolean }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(false);
  }

  return (
    <>
      <Button
        ref={button}
        variant="ghost"
        size="icon"
        className="xl:hidden"
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={() => void loadDrawer()}
        onTouchStart={() => void loadDrawer()}
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
      >
        <Menu className="size-6" />
      </Button>
      {used && (
        <MobileNavDrawer
          open={open}
          onOpenChange={setOpen}
          returnFocus={() => button.current?.focus()}
          labels={labels}
          showFaq={showFaq}
        />
      )}
    </>
  );
}
