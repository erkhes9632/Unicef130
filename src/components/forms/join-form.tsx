"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { submitJoinApplication } from "@/app/actions/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { helpOptions, joinFormSchema, type JoinFormValues } from "@/lib/validation/forms";
import { cn } from "@/lib/utils";
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

export function JoinForm() {
  const t = useTranslations("Forms");
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<JoinFormValues>({ resolver: zodResolver(joinFormSchema), defaultValues });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const res = await submitJoinApplication(values);
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
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 rounded-3xl bg-brand-green-soft p-8 text-center"
      >
        <CheckCircle2 className="size-12 text-brand-green-strong" aria-hidden="true" />
        <h2 className="text-2xl font-extrabold">{t("joinSuccessTitle")}</h2>
        <p className="text-muted-foreground">{t("joinSuccessBody")}</p>
        <Button variant="outline" onClick={() => setDone(false)}>
          {t("sendAnother")}
        </Button>
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
              {helpOptions.map((opt) => {
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
                    {t(`helpOptions.${opt}`)}
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
