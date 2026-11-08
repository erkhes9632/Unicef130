"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { submitContactMessage } from "@/app/actions/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactFormSchema, type ContactFormValues } from "@/lib/validation/forms";
import { Turnstile } from "./turnstile";
import { FormField } from "./form-field";

const defaultValues: ContactFormValues = { name: "", email: "", subject: "", message: "" };

export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const t = useTranslations("Forms");
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState("");
  // Bumping the key remounts the widget → fresh token (tokens are single-use).
  const [widgetKey, setWidgetKey] = useState(0);
  const { register, handleSubmit, formState, setError, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues,
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    if (!token) {
      setServerError(t("captchaError"));
      return;
    }
    startTransition(async () => {
      const res = await submitContactMessage({ ...values, turnstileToken: token });
      setToken("");
      setWidgetKey((k) => k + 1);
      if (res.ok) {
        setDone(true);
        reset(defaultValues);
        return;
      }
      if (res.error === "validation" && res.fieldErrors) {
        for (const [field, messages] of Object.entries(res.fieldErrors)) {
          setError(field as keyof ContactFormValues, { message: messages?.[0] ?? "required" });
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
        <h3 className="text-xl font-extrabold">{t("contactSuccessTitle")}</h3>
        <p className="text-muted-foreground">{t("contactSuccessBody")}</p>
        <Button variant="outline" onClick={() => setDone(false)}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="contact-name" label={t("name")} error={errors.name?.message}>
          {(a) => <Input {...a} autoComplete="name" {...register("name")} />}
        </FormField>
        <FormField id="contact-email" label={t("email")} error={errors.email?.message}>
          {(a) => (
            <Input
              {...a}
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              {...register("email")}
            />
          )}
        </FormField>
      </div>
      <FormField id="contact-subject" label={t("subject")} optional error={errors.subject?.message}>
        {(a) => <Input {...a} {...register("subject")} />}
      </FormField>
      <FormField id="contact-message" label={t("message")} error={errors.message?.message}>
        {(a) => (
          <Textarea
            {...a}
            rows={5}
            placeholder={t("messagePlaceholder")}
            {...register("message")}
          />
        )}
      </FormField>
      <Turnstile key={widgetKey} siteKey={turnstileSiteKey} onToken={setToken} action="contact" />

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
