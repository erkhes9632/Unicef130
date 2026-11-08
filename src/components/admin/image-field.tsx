"use client";

import { ImageOff, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Image picker that stores the image URL in a hidden input (`name`).
 * Phase 7 adds R2 upload; until then a URL/path can be typed in.
 */
export function ImageField({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
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
      <div className="flex max-w-sm gap-2">
        <Input
          id={id}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/media/... эсвэл https://..."
        />
        {url && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setUrl("")}
            aria-label="Зургийг арилгах"
          >
            <X />
          </Button>
        )}
      </div>
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
