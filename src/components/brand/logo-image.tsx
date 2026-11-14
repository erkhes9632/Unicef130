"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type LogoImageProps = {
  /** null → no logo available: the monogram fallback is rendered. */
  src: string | null;
  alt: string;
  /** Rendered height in px (width follows the image aspect ratio). */
  size?: number;
  /** Text shown in the fallback badge (e.g. "130"). */
  monogram: string;
  className?: string;
};

/** Clean text badge used when no logo file exists (logos are never drawn or generated). */
export function Monogram({
  text,
  size = 40,
  label,
  className,
}: {
  text: string;
  size?: number;
  /** Accessible name; omit when the surrounding text already names the club. */
  label?: string;
  className?: string;
}) {
  return (
    <span
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      style={{ height: size, width: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-cyan font-heading leading-none font-extrabold tracking-tight text-brand-night shadow-sm ring-2 ring-background",
        className,
      )}
    >
      {text}
    </span>
  );
}

/**
 * Shows a logo (admin upload or public/logos/*). Falls back to the monogram when there is no
 * file, or when the image fails to load.
 */
export function LogoImage({ src, alt, size = 40, monogram, className }: LogoImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <Monogram text={monogram} size={size} label={alt} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo file, no optimizer on Workers
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
