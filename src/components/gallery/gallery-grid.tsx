"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { GalleryImage } from "@/lib/types";

/** Masonry-like photo grid with an accessible lightbox (keyboard arrows + swipe). */
export function GalleryGrid({ images, title }: { images: GalleryImage[]; title: string }) {
  const t = useTranslations("Gallery");
  const [index, setIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const total = images.length;
  const current = index === null ? null : images[index];

  const go = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + total) % total)),
    [total],
  );

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {images.map((img, i) => (
          <li key={img.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={t("openImage", { alt: img.alt })}
              className="group block w-full overflow-hidden rounded-2xl ring-1 ring-border focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- R2 thumbnails */}
              <img
                src={img.thumbUrl}
                alt={img.alt}
                width={img.width}
                height={img.height}
                loading="lazy"
                decoding="async"
                className="h-auto w-full transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(96vw,1200px)] border-0 bg-black/95 p-0 text-white sm:max-w-[min(96vw,1200px)]"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            const end = e.changedTouches[0]?.clientX;
            if (start !== null && end !== undefined && Math.abs(end - start) > 50)
              go(end < start ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{current?.alt}</DialogDescription>
          {current && (
            <figure className="relative flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element -- full-size R2 image */}
              <img
                src={current.url}
                alt={current.alt}
                className="mx-auto max-h-[80vh] w-auto rounded-t-lg object-contain"
              />
              <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="truncate">{current.alt}</span>
                <span className="shrink-0 tabular-nums opacity-80">
                  {t("counter", { current: (index ?? 0) + 1, total })}
                </span>
              </figcaption>
              {total > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => go(-1)}
                    aria-label={t("previous")}
                    className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/85 text-black hover:bg-white"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => go(1)}
                    aria-label={t("next")}
                    className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/85 text-black hover:bg-white"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIndex(null)}
                aria-label={t("close")}
                className="absolute top-2 right-2 bg-white/85 text-black hover:bg-white"
              >
                <X />
              </Button>
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
