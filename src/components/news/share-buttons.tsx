"use client";

import { Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SocialIcon } from "@/components/brand/social-icon";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
const canNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const t = useTranslations("Share");
  const nativeShare = useSyncExternalStore(subscribe, canNativeShare, () => false);
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch {
      window.prompt(t("copy"), url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold">{t("title")}:</span>
      <Button asChild variant="outline" size="sm">
        <a href={fbHref} target="_blank" rel="noopener noreferrer" aria-label={t("facebook")}>
          <SocialIcon platform="facebook" className="size-3.5" /> Facebook
        </a>
      </Button>
      <Button variant="outline" size="sm" onClick={copy}>
        <Link2 /> {t("copy")}
      </Button>
      {nativeShare && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigator.share({ title, url }).catch(() => {})}
        >
          <Share2 /> {t("native")}
        </Button>
      )}
    </div>
  );
}
