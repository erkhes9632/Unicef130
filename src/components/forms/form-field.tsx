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
] as const;

export function translateError(t: ReturnType<typeof useTranslations<"Forms">>, key: string) {
  return (knownErrors as readonly string[]).includes(key)
    ? t(`errors.${key as (typeof knownErrors)[number]}`)
    : t("errors.required");
}
