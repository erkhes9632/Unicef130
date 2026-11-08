"use client";

import { ImageOff, ImageUp, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FULL_MAX_EDGE, type MediaKind } from "@/lib/media/constants";
import { processImage, uploadImage } from "@/lib/media/client";

/**
 * Image picker: resizes in the browser, uploads to R2 and stores the resulting URL in a hidden
 * input (`name`). The old image is cleaned up on the server when the record is saved/deleted.
 */
export function ImageField({
  id,
  name,
  defaultValue,
  kind,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  kind: MediaKind;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { blob } = await processImage(file, FULL_MAX_EDGE);
      setUrl(await uploadImage(blob, kind));
      toast.success("Зураг хуулагдлаа. Хадгалахаа мартуузай.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex aspect-[16/9] w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <ImageOff className="size-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          aria-describedby={hintId}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ImageUp />}
          {url ? "Зураг солих" : "Зураг сонгох"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setUrl("")}>
            <X /> Арилгах
          </Button>
        )}
      </div>
      <p id={hintId} className="text-xs text-muted-foreground">
        JPG, PNG, WebP. Автоматаар {FULL_MAX_EDGE}px хүртэл багасгаж, байршлын (GPS) мэдээллийг
        арилгана.
      </p>
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
