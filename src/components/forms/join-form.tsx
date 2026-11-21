"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { submitJoinApplication } from "@/app/actions/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildJoinSchema, type JoinFormValues } from "@/lib/validation/forms";
import { ErrorSummary, FormField, translateError } from "./form-field";

type JoinFormQuestion = {
  id: string;
  type: "text" | "choice" | "checkbox";
  label: string;
  options: string[];
  required: boolean;
};

const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/**
 * Join form for a signed-in applicant. The account's e-mail is shown, not asked; the name is
 * prefilled from the account when it is already written in Cyrillic. After a successful submit
 * the page refreshes and shows the application's status instead of the form.
 */
export function JoinForm({
  helpOptions,
  classes,
  questions,
  waitlist,
  accountEmail,
  defaultName,
}: {
  /** Locale-resolved options from admin settings. */
  helpOptions: { key: string; label: string }[];
  /** Classes offered in this recruitment period (empty → free text). */
  classes: string[];
  questions: JoinFormQuestion[];
  /** Capacity reached: new applications join the waiting list. */
  waitlist: boolean;
  accountEmail: string;
  defaultName: string;
}) {
  const t = useTranslations("Forms");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const schema = useMemo(() => buildJoinSchema({ classes, questions }), [classes, questions]);
  const defaultValues: JoinFormValues = {
    fullName: defaultName,
    className: "",
    phone: "",
    reason: "",
    helpWith: [],
    answers: Object.fromEntries(questions.map((q) => [q.id, q.type === "checkbox" ? false : ""])),
    consent: false as unknown as true,
  };
  // Errors appear when a field is left (blur), then update as the person types.
  const form = useForm<JoinFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, setError } = form;
  const errors = formState.errors;

  const serverMessages = {
    unauthenticated: t("signInAgainError"),
    member: t("alreadyMemberError"),
    blocked: t("applyBlockedError"),
    duplicate: t("duplicateBody"),
    closed: t("joinClosedError"),
    full: t("joinFullError"),
    rate: t("rateError"),
    validation: t("validationError"),
    server: t("genericError"),
  } as const;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const res = await submitJoinApplication(values);
      if (res.ok) {
        toast.success(res.waitlisted ? t("joinWaitlistTitle") : t("joinSuccessTitle"));
        router.refresh();
        return;
      }
      if (res.error === "duplicate" || res.error === "member") {
        router.refresh();
        return;
      }
      if (res.error === "validation" && res.fieldErrors) {
        for (const [field, messages] of Object.entries(res.fieldErrors)) {
          setError(field as keyof JoinFormValues, { message: messages?.[0] ?? "required" });
        }
      }
      setServerError(serverMessages[res.error]);
    });
  });

  const answerError = (id: string) =>
    (errors.answers as Record<string, { message?: string }> | undefined)?.[id]?.message;
  const summary =
    formState.submitCount > 0
      ? [
          { id: "join-fullName", label: t("fullName"), error: errors.fullName?.message },
          { id: "join-className", label: t("className"), error: errors.className?.message },
          { id: "join-phone", label: t("phone"), error: errors.phone?.message },
          { id: "join-reason", label: t("reason"), error: errors.reason?.message },
          { id: "join-helpWith", label: t("helpWith"), error: errors.helpWith?.message },
          ...questions.map((q) => ({
            id: `join-q-${q.id}`,
            label: q.label,
            error: answerError(q.id),
          })),
          { id: "join-consent", label: t("consentShort"), error: errors.consent?.message },
        ].flatMap((i) =>
          i.error ? [{ id: i.id, label: i.label, message: translateError(t, i.error) }] : [],
        )
      : [];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <ErrorSummary title={t("errorSummary")} items={summary} />
      {waitlist && (
        <p role="status" className="rounded-2xl bg-brand-gold-soft p-4 text-sm font-medium">
          {t("waitlistNotice")}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="join-fullName"
          label={t("fullName")}
          error={errors.fullName?.message}
          hint={t("fullNameHint")}
        >
          {(a) => (
            <Input
              {...a}
              autoComplete="name"
              placeholder={t("fullNamePlaceholder")}
              {...register("fullName")}
            />
          )}
        </FormField>
        <FormField id="join-className" label={t("className")} error={errors.className?.message}>
          {(a) =>
            classes.length > 0 ? (
              <select {...a} className={selectClass} defaultValue="" {...register("className")}>
                <option value="" disabled>
                  {t("classNameSelect")}
                </option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <Input {...a} placeholder={t("classNamePlaceholder")} {...register("className")} />
            )
          }
        </FormField>
        <FormField id="join-phone" label={t("phone")} error={errors.phone?.message}>
          {(a) => (
            <Input
              {...a}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("phonePlaceholder")}
              {...register("phone")}
            />
          )}
        </FormField>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">{t("email")}</p>
          <p className="flex h-10 items-center gap-2 rounded-lg bg-muted/60 px-3 text-sm">
            <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{accountEmail}</span>
          </p>
          <p className="text-xs text-muted-foreground">{t("emailFromAccount")}</p>
        </div>
      </div>

      <FormField id="join-reason" label={t("reason")} error={errors.reason?.message}>
        {(a) => (
          <Textarea {...a} rows={4} placeholder={t("reasonPlaceholder")} {...register("reason")} />
        )}
      </FormField>

      <fieldset
        id="join-helpWith"
        tabIndex={-1}
        className="space-y-3"
        aria-describedby={errors.helpWith ? "join-helpWith-error" : undefined}
      >
        <legend className="text-sm font-semibold">{t("helpWith")}</legend>
        <Controller
          control={control}
          name="helpWith"
          render={({ field }) => (
            <div className="grid gap-2 sm:grid-cols-2">
              {helpOptions.map(({ key: opt, label }) => {
                const checked = field.value.includes(opt);
                return (
                  <label
                    key={opt}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors hover:bg-muted",
                      checked && "border-brand-cyan bg-brand-cyan-soft",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        field.onChange(
                          v ? [...field.value, opt] : field.value.filter((x) => x !== opt),
                        )
                      }
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.helpWith && (
          <p id="join-helpWith-error" role="alert" className="text-sm font-medium text-destructive">
            {translateError(t, errors.helpWith.message ?? "helpWith")}
          </p>
        )}
      </fieldset>

      {questions.map((q) => {
        const id = `join-q-${q.id}`;
        const name = `answers.${q.id}` as `answers.${string}`;
        if (q.type === "checkbox") {
          return (
            <Controller
              key={q.id}
              control={control}
              name={name}
              render={({ field }) => (
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={field.value === true}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      aria-invalid={Boolean(answerError(q.id))}
                    />
                    <span>
                      {q.label}
                      {!q.required && (
                        <span className="text-muted-foreground"> {t("optional")}</span>
                      )}
                    </span>
                  </label>
                  {answerError(q.id) && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {translateError(t, answerError(q.id)!)}
                    </p>
                  )}
                </div>
              )}
            />
          );
        }
        return (
          <FormField
            key={q.id}
            id={id}
            label={q.label}
            optional={!q.required}
            error={answerError(q.id)}
          >
            {(a) =>
              q.type === "choice" ? (
                <select {...a} className={selectClass} defaultValue="" {...register(name)}>
                  <option value="">{t("choose")}</option>
                  {q.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <Textarea {...a} rows={2} maxLength={500} {...register(name)} />
              )
            }
          </FormField>
        );
      })}

      <Controller
        control={control}
        name="consent"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
              <Checkbox
                id="join-consent"
                className="mt-0.5"
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                aria-invalid={Boolean(errors.consent)}
                aria-describedby={errors.consent ? "join-consent-error" : undefined}
              />
              <span>{t("consent")}</span>
            </label>
            {errors.consent && (
              <p
                id="join-consent-error"
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {translateError(t, errors.consent.message ?? "consent")}
              </p>
            )}
          </div>
        )}
      />

      {serverError && (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending && <Loader2 className="animate-spin" />}
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
