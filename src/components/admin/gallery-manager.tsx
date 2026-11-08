"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/admin/action-state";
import { FULL_MAX_EDGE, THUMB_MAX_EDGE } from "@/lib/media/constants";
import { processImage, uploadImage } from "@/lib/media/client";
import { cn } from "@/lib/utils";

type Img = { id: string; url: string; thumbUrl: string; alt: string };
type NewImage = { url: string; thumbUrl: string; width: number; height: number; alt: string };

export function GalleryManager({
  albumTitle,
  images,
  coverUrl,
  addImages,
  deleteImage,
  moveImage,
  updateAlt,
  setCover,
}: {
  albumTitle: string;
  images: Img[];
  coverUrl: string | null;
  addImages: (images: NewImage[]) => Promise<ActionState>;
  deleteImage: (id: string) => Promise<ActionState>;
  moveImage: (id: string, direction: "up" | "down") => Promise<ActionState>;
  updateAlt: (id: string, alt: string) => Promise<ActionState>;
  setCover: (id: string) => Promise<ActionState>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pending, start] = useTransition();

  const notify = (res: ActionState) => {
    if (res.ok) {
      if (res.message) toast.success(res.message);
    } else toast.error(res.message ?? "Алдаа гарлаа");
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 50);
    const uploaded: NewImage[] = [];
    setProgress({ done: 0, total: list.length });
    for (const [i, file] of list.entries()) {
      try {
        const full = await processImage(file, FULL_MAX_EDGE);
        const thumb = await processImage(file, THUMB_MAX_EDGE, 0.78);
        const [url, thumbUrl] = await Promise.all([
          uploadImage(full.blob, "gallery"),
          uploadImage(thumb.blob, "gallery", "thumb"),
        ]);
        uploaded.push({
          url,
          thumbUrl,
          width: full.width,
          height: full.height,
          alt: `${albumTitle} — ${images.length + uploaded.length + 1}`,
        });
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "алдаа"}`);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    if (uploaded.length) notify(await addImages(uploaded));
    setProgress(null);
    if (input.current) input.current.value = "";
  }

  const busy = pending || progress !== null;

  return (
    <section className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Зургууд ({images.length})</h2>
          <p className="text-xs text-muted-foreground">
            Олон зураг зэрэг сонгож болно. Автоматаар багасгаж, GPS мэдээллийг арилгана. Хүүхдийн
            зургийг зөвшөөрөлтэйгээр нийтэлнэ үү.
          </p>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          id="gallery-upload"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button type="button" disabled={busy} onClick={() => input.current?.click()}>
          {progress ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {progress ? `Хуулж байна ${progress.done}/${progress.total}` : "Зураг нэмэх"}
        </Button>
      </div>

      {images.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          Энэ цомогт зураг алга.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.id}
              className={cn(
                "space-y-2 rounded-xl border p-2",
                coverUrl === img.thumbUrl && "ring-2 ring-brand-gold",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
              <img
                src={img.thumbUrl}
                alt={img.alt}
                className="aspect-[4/3] w-full rounded-lg object-cover"
                loading="lazy"
              />
              <Input
                defaultValue={img.alt}
                aria-label="Зургийн тайлбар (alt)"
                maxLength={200}
                className="h-8 text-xs"
                onBlur={(e) => {
                  if (e.target.value !== img.alt)
                    start(async () => notify(await updateAlt(img.id, e.target.value)));
                }}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Урагш"
                  disabled={busy || i === 0}
                  onClick={() => start(async () => notify(await moveImage(img.id, "up")))}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Хойш"
                  disabled={busy || i === images.length - 1}
                  onClick={() => start(async () => notify(await moveImage(img.id, "down")))}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Нүүр зураг болгох"
                  title="Нүүр зураг болгох"
                  disabled={busy || coverUrl === img.thumbUrl}
                  onClick={() => start(async () => notify(await setCover(img.id)))}
                >
                  <Star
                    className={cn(coverUrl === img.thumbUrl && "fill-brand-gold text-brand-gold")}
                  />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Устгах"
                  className="ml-auto text-destructive"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Энэ зургийг устгах уу?"))
                      start(async () => notify(await deleteImage(img.id)));
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
