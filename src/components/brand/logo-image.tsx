"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type LogoImageProps = {
  src: string;
  alt: string;
  /** Rendered height in px (width follows the image aspect ratio). */
  size?: number;
  placeholderLabel: string;
  className?: string;
};

/**
 * Shows a logo file provided by the developer (public/logos/*). Logos are never drawn or
 * generated: until the file exists, a neutral placeholder box is shown instead.
 */
export function LogoImage({ src, alt, size = 40, placeholderLabel, className }: LogoImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        style={{ height: size, width: size }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
          className,
        )}
      >
        {placeholderLabel}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static logo file, no optimizer on Workers
    <img
      src={src}
      alt={alt}
      height={size}
      style={{ height: size, width: "auto" }}
      className={cn("shrink-0 object-contain", className)}
      onError={() => setFailed(true)}
      // The image may fail before hydration attaches onError: detect that on mount.
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
    />
  );
}
