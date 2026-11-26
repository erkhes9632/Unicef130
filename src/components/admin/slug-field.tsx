"use client";

import { LockOpen, TriangleAlert, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/slug";

/**
 * Address (slug) input. New items: empty → generated from the title on save, or with «Үүсгэх».
 * Once an item has been published (`locked`), its address is read-only: people may have shared
 * it. «Хаяг өөрчлөх» unlocks it; the old address then redirects to the new one (308).
 */
export function SlugField({
  id,
  name,
  defaultValue,
  sourceId,
  locked = false,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  sourceId: string;
  locked?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [unlocked, setUnlocked] = useState(!locked);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input
          ref={ref}
          id={id}
          name={name}
          defaultValue={defaultValue}
          readOnly={!unlocked}
          aria-describedby={locked ? `${id}-note` : undefined}
          placeholder="avtomataar-uusgene"
          className="min-w-0 flex-1 font-mono text-sm read-only:bg-muted/60"
        />
        {unlocked ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const source = document.getElementById(sourceId) as HTMLInputElement | null;
              if (ref.current && source) ref.current.value = slugify(source.value);
            }}
          >
            <Wand2 aria-hidden="true" /> Үүсгэх
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setUnlocked(true);
              ref.current?.focus();
            }}
          >
            <LockOpen aria-hidden="true" /> Хаяг өөрчлөх
          </Button>
        )}
      </div>
      {locked && (
        <p id={`${id}-note`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
          {unlocked && (
            <TriangleAlert
              className="mt-0.5 size-3.5 shrink-0 text-brand-gold-strong"
              aria-hidden="true"
            />
          )}
          {unlocked
            ? "Хуучин хаяг автоматаар шинэ рүү шилжинэ."
            : "Нийтлэгдсэн тул хаяг түгжээтэй (хүмүүс хуваалцсан байж болно)."}
        </p>
      )}
    </div>
  );
}
