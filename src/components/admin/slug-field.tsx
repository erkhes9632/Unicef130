"use client";

import { Wand2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/slug";

/** Slug input with a button that transliterates the title field (by id). Empty → generated on save. */
export function SlugField({
  id,
  name,
  defaultValue,
  sourceId,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  sourceId: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex gap-2">
      <Input
        ref={ref}
        id={id}
        name={name}
        defaultValue={defaultValue}
        placeholder="avtomataar-uusgene"
        className="font-mono text-sm"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const source = document.getElementById(sourceId) as HTMLInputElement | null;
          if (ref.current && source) ref.current.value = slugify(source.value);
        }}
      >
        <Wand2 /> Үүсгэх
      </Button>
    </div>
  );
}
