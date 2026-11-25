"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import { toast } from "sonner";
import { keepValuesOnSubmit } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NAME_MAX } from "@/lib/users/profile";
import type { ProfileFormState } from "@/lib/users/profile-ops";

/** All visible text, resolved on the server (the admin dialog is Mongolian only, /me has both). */
export type ProfileFormLabels = {
  lastName: string;
  firstName: string;
  className: string;
  classHint: string;
  classOptional: string;
  email: string;
  emailNote: string;
  save: string;
  saved: string;
  chooseClass: string;
  errors: Record<string, string>;
};

/**
 * Last name, first name and class of one person, plus the read-only e-mail. The server
 * re-validates everything (`saveMyProfile` / `updateUserProfile`); typed values survive an
 * error (no automatic form reset, see keepValuesOnSubmit).
 */
export function ProfileForm({
  action,
  initial,
  email,
  classes,
  classRequired,
  labels,
  onSaved,
}: {
  action: (prev: ProfileFormState, data: FormData) => Promise<ProfileFormState>;
  initial: { lastName: string; firstName: string; className: string };
  email: string;
  /** The open enrollment's class list (a select); empty = free text like "10А". */
  classes: string[];
  classRequired: boolean;
  labels: ProfileFormLabels;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  // Unique ids: the admin page has one form per user row.
  const idPrefix = useId();
  const shown = useRef(state);
  useEffect(() => {
    if (state === shown.current) return;
    shown.current = state;
    if (state.ok) {
      toast.success(labels.saved);
      onSaved?.();
    } else if (state.error && state.error !== "validation")
      toast.error(labels.errors[state.error] ?? labels.errors.server);
  }, [state, labels, onSaved]);

  const err = (k: "lastName" | "firstName" | "className") => {
    const code = state.fieldErrors?.[k];
    return code ? (labels.errors[code] ?? labels.errors.server) : undefined;
  };
  const field = "space-y-1 text-sm font-semibold";
  const errorText = "text-xs font-medium text-destructive";

  return (
    <form
      action={formAction}
      onSubmit={keepValuesOnSubmit(formAction)}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {(["lastName", "firstName"] as const).map((k) => (
          <div key={k} className={field}>
            <label htmlFor={`${idPrefix}-${k}`} className="block">
              {labels[k]}
            </label>
            <Input
              id={`${idPrefix}-${k}`}
              name={k}
              defaultValue={initial[k]}
              required
              maxLength={NAME_MAX}
              autoComplete={k === "lastName" ? "family-name" : "given-name"}
              aria-invalid={!!err(k)}
              aria-describedby={err(k) ? `${idPrefix}-${k}-error` : undefined}
            />
            {err(k) && (
              <p id={`${idPrefix}-${k}-error`} className={errorText}>
                {err(k)}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className={field}>
        <label htmlFor={`${idPrefix}-className`} className="block">
          {labels.className}
          {!classRequired && (
            <span className="font-normal text-muted-foreground"> {labels.classOptional}</span>
          )}
        </label>
        {classes.length > 0 ? (
          <select
            id={`${idPrefix}-className`}
            name="className"
            defaultValue={initial.className}
            required={classRequired}
            aria-invalid={!!err("className")}
            aria-describedby={`${idPrefix}-className-hint`}
            className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">{labels.chooseClass}</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={`${idPrefix}-className`}
            name="className"
            defaultValue={initial.className}
            maxLength={10}
            placeholder="10А"
            required={classRequired}
            aria-invalid={!!err("className")}
            aria-describedby={`${idPrefix}-className-hint`}
          />
        )}
        <p id={`${idPrefix}-className-hint`} className="text-xs font-normal text-muted-foreground">
          {labels.classHint}
        </p>
        {err("className") && <p className={errorText}>{err("className")}</p>}
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{labels.email}</p>
        <p className="rounded-lg bg-muted/60 px-3 py-2.5 break-all">{email}</p>
        <p className="text-xs text-muted-foreground">{labels.emailNote}</p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
        {labels.save}
      </Button>
    </form>
  );
}
