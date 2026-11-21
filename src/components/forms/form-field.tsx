"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + translated error message, wired with aria attributes. */
export function FormField({
  id,
  label,
  optional,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  /** i18n key under Forms.errors */
  error?: string;
  hint?: string;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const t = useTranslations("Forms");
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> {t("optional")}</span>}
      </Label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {translateError(t, error)}
        </p>
      )}
    </div>
  );
}

const knownErrors = [
  "required",
  "tooShort",
  "tooLong",
  "email",
  "phone",
  "className",
  "consent",
  "helpWith",
  "nameCyrillic",
  "noLinks",
] as const;

export function translateError(t: ReturnType<typeof useTranslations<"Forms">>, key: string) {
  return (knownErrors as readonly string[]).includes(key)
    ? t(`errors.${key as (typeof knownErrors)[number]}`)
    : t("errors.required");
}

/**
 * Shown above a form after a submit with errors: what to fix, each linking to its field. The
 * field-level messages stay; this is the overview screen readers announce first.
 */
export function ErrorSummary({
  title,
  items,
}: {
  title: string;
  items: { id: string; label: string; message: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
      <p className="font-semibold">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="underline underline-offset-2">
              {i.label}: {i.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
