"use client";

import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { startTransition, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/admin/action-state";
import { cn } from "@/lib/utils";

/**
 * `onSubmit` for edit forms: runs the action without React's automatic form reset, so what the
 * admin typed survives a validation error. `useFormStatus` still reports pending, and the
 * `action` prop stays as the no-JS fallback.
 */
export function keepValuesOnSubmit(formAction: (data: FormData) => void) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(data));
  };
}

export function AdminField({
  label,
  htmlFor,
  hint,
  errors,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  errors?: string[];
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} role="alert" className="text-sm font-medium text-destructive">
          {e}
        </p>
      ))}
    </div>
  );
}

export function SubmitButton({
  children = "Хадгалах",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {children}
    </Button>
  );
}

/** Bottom bar that stays in view while a long form scrolls (Save is always one tap away). */
export function StickyActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background px-4 py-3 sm:-mx-6 sm:px-6 md:bg-background/90 md:backdrop-blur lg:-mx-8 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The result of a save: a toast (seen wherever the admin has scrolled to) plus the same text
 * at the top of the form (kept for screen readers and for errors with field details).
 */
export function FormAlert({
  state,
  toast: withToast = true,
}: {
  state: ActionState;
  /** Off where the form shows its own toast (e.g. a form that remounts after saving). */
  toast?: boolean;
}) {
  useEffect(() => {
    if (!state.message || !withToast) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state, withToast]);
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "flex items-center gap-2 rounded-xl p-3 text-sm font-medium",
        state.ok ? "bg-brand-green-soft text-foreground" : "bg-destructive/10 text-destructive",
      )}
    >
      {state.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
      {state.message}
    </p>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-6">
      <div>
        <h2 className="font-bold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Native select styled like shadcn inputs (works with FormData without extra wiring). */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 pointer-coarse:h-11",
        className,
      )}
      {...props}
    />
  );
}
