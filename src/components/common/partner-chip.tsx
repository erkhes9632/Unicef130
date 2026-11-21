import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/** Initials of an organisation name ("Bridge Blue Agency" → "BB"). */
export function initialsOf(name: string) {
  const words = name
    .replace(/[«»"“”().,]/g, " ")
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  return (
    words
      .slice(0, 2)
      .map((w) => w[0]!.toLocaleUpperCase())
      .join("") || "•"
  );
}

/**
 * A partner / beneficiary as a pill: logo when one is set (admin), otherwise an initials
 * monogram. Links out (new tab) when a URL is set.
 */
export function PartnerChip({
  name,
  logoUrl,
  url,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  url?: string | null;
  className?: string;
}) {
  const body = (
    <>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-set logo URL
        <img
          src={logoUrl}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          className="size-9 shrink-0 rounded-full bg-white object-contain p-1 ring-1 ring-black/5"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-cyan-soft font-heading text-xs font-extrabold text-brand-cyan-strong"
        >
          {initialsOf(name)}
        </span>
      )}
      <span className="min-w-0 text-sm leading-snug font-semibold">{name}</span>
      {url && (
        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
    </>
  );
  const cls = cn(
    "inline-flex min-h-12 max-w-full items-center gap-2.5 rounded-full bg-card py-1.5 pr-4 pl-1.5 shadow-soft ring-1 ring-border",
    url && "hover-lift",
    className,
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}
