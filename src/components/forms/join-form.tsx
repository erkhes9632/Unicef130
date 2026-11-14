"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CheckCircle2, Loader2, Newspaper } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { submitJoinApplication } from "@/app/actions/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { joinFormSchema, type JoinFormValues } from "@/lib/validation/forms";
import { cn } from "@/lib/utils";
import { Turnstile } from "./turnstile";
import { FormField, translateError } from "./form-field";

const defaultValues: JoinFormValues = {
  fullName: "",
  className: "",
  phone: "",
  email: "",
  reason: "",
  helpWith: [],
  consent: false as unknown as true,
};

export function JoinForm({
  turnstileSiteKey,
  helpOptions,
}: {
  turnstileSiteKey: string;
  /** Locale-resolved options from admin settings. */
  helpOptions: { key: string; label: string }[];
}) {
  const t = useTranslations("Forms");
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState("");
  // Bumping the key remounts the widget → fresh token (tokens are single-use).
  const [widgetKey, setWidgetKey] = useState(0);
  const form = useForm<JoinFormValues>({ resolver: zodResolver(joinFormSchema), defaultValues });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    if (!token) {
      setServerError(t("captchaError"));
      return;
    }
    startTransition(async () => {
      const res = await submitJoinApplication({ ...values, turnstileToken: token });
      setToken("");
      setWidgetKey((k) => k + 1);
      if (res.ok) {
        setDone(true);
        reset(defaultValues);
        return;
      }
      if (res.error === "validation" && res.fieldErrors) {
        for (const [field, messages] of Object.entries(res.fieldErrors)) {
          setError(field as keyof JoinFormValues, { message: messages?.[0] ?? "required" });
        }
      }
      setServerError(res.error === "captcha" ? t("captchaError") : t("genericError"));
    });
  });

  if (done) {
    const steps = t.raw("joinNextSteps") as string[];
    return (
      <div
        role="status"
        tabIndex={-1}
        ref={(el) => el?.focus()}
        className="flex flex-col items-center gap-5 rounded-3xl bg-brand-green-soft p-6 text-center outline-none sm:p-10"
      >
        <CheckCircle2 className="size-14 text-brand-green-strong" aria-hidden="true" />
        <h2 className="text-2xl font-extrabold">{t("joinSuccessTitle")}</h2>
        <div className="w-full max-w-md text-left">
          <p className="mb-3 font-semibold">{t("joinSuccessBody")}</p>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background font-bold text-brand-green-strong ring-1 ring-border">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/events">
              <CalendarDays /> {t("joinSeeEvents")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-background">
            <Link href="/news">
              <Newspaper /> {t("joinSeeNews")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="join-fullName" label={t("fullName")} error={errors.fullName?.message}>
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
          {(a) => (
            <Input {...a} placeholder={t("classNamePlaceholder")} {...register("className")} />
          )}
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
        <FormField id="join-email" label={t("email")} optional error={errors.email?.message}>
          {(a) => (
            <Input
              {...a}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              {...register("email")}
            />
          )}
        </FormField>
      </div>

      <FormField id="join-reason" label={t("reason")} error={errors.reason?.message}>
        {(a) => (
          <Textarea {...a} rows={4} placeholder={t("reasonPlaceholder")} {...register("reason")} />
        )}
      </FormField>

      <fieldset
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

      <Controller
        control={control}
        name="consent"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
              <Checkbox
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

      <Turnstile
        key={widgetKey}
        siteKey={turnstileSiteKey}
        onToken={setToken}
        onError={() => setServerError(t("turnstileLoadError"))}
        action="join"
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
