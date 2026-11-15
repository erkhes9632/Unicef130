"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CheckCircle2, Copy, Loader2, Newspaper, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { submitJoinApplication } from "@/app/actions/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { buildJoinSchema, type JoinFormValues } from "@/lib/validation/forms";
import { cn } from "@/lib/utils";
import { FormField, translateError } from "./form-field";
import { Turnstile } from "./turnstile";

export type JoinFormQuestion = {
  id: string;
  type: "text" | "choice" | "checkbox";
  label: string;
  options: string[];
  required: boolean;
};

const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function JoinForm({
  turnstileSiteKey,
  helpOptions,
  classes,
  questions,
  formToken,
  waitlist,
}: {
  turnstileSiteKey: string;
  /** Locale-resolved options from admin settings. */
  helpOptions: { key: string; label: string }[];
  /** Classes offered in this recruitment period (empty → free text). */
  classes: string[];
  questions: JoinFormQuestion[];
  /** Signed render time: lets the server measure how long filling the form took. */
  formToken: string;
  /** Capacity reached: new applications join the waiting list. */
  waitlist: boolean;
}) {
  const t = useTranslations("Forms");
  const [done, setDone] = useState<{ code: string | null; waitlisted: boolean } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState("");
  const [website, setWebsite] = useState("");
  // Bumping the key remounts the widget → fresh token (tokens are single-use).
  const [widgetKey, setWidgetKey] = useState(0);

  const schema = useMemo(() => buildJoinSchema({ classes, questions }), [classes, questions]);
  const defaultValues: JoinFormValues = {
    fullName: "",
    className: "",
    phone: "",
    email: "",
    reason: "",
    helpWith: [],
    answers: Object.fromEntries(questions.map((q) => [q.id, q.type === "checkbox" ? false : ""])),
    consent: false as unknown as true,
  };
  const form = useForm<JoinFormValues>({ resolver: zodResolver(schema), defaultValues });
  const { register, control, handleSubmit, formState, setError } = form;
  const errors = formState.errors;

  const serverMessages = {
    captcha: t("captchaError"),
    unavailable: t("unavailable"),
    closed: t("joinClosedError"),
    full: t("joinFullError"),
    rate: t("rateError"),
    tooFast: t("tooFastError"),
    stale: t("staleError"),
    validation: t("validationError"),
    server: t("genericError"),
  } as const;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setDuplicate(false);
    if (!token) {
      setServerError(t("captchaError"));
      return;
    }
    startTransition(async () => {
      const res = await submitJoinApplication({
        ...values,
        turnstileToken: token,
        website,
        formToken,
      });
      setToken("");
      setWidgetKey((k) => k + 1);
      if (res.ok) {
        setDone({ code: res.trackingCode, waitlisted: res.waitlisted });
        return;
      }
      if (res.error === "duplicate") {
        setDuplicate(true);
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
        <h2 className="text-2xl font-extrabold">
          {done.waitlisted ? t("joinWaitlistTitle") : t("joinSuccessTitle")}
        </h2>
        {done.code && (
          <div className="w-full max-w-sm rounded-2xl bg-background p-4 ring-1 ring-border">
            <p className="text-sm text-muted-foreground">{t("trackingCodeLabel")}</p>
            <p className="my-1 font-mono text-3xl font-extrabold tracking-widest">{done.code}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                navigator.clipboard.writeText(done.code!).then(
                  () => toast.success(t("copied")),
                  () => undefined,
                )
              }
            >
              <Copy /> {t("copy")}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">{t("trackingCodeHint")}</p>
          </div>
        )}
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
            <Link href="/join/status">
              <Search /> {t("checkStatus")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-background">
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

  const answerError = (id: string) =>
    (errors.answers as Record<string, { message?: string }> | undefined)?.[id]?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
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

      {/* Honeypot: invisible to people (and assistive tech), tempting for form-filling scripts. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <Turnstile
        key={widgetKey}
        siteKey={turnstileSiteKey}
        onToken={setToken}
        onError={() => setServerError(t("turnstileLoadError"))}
        action="join"
      />

      {duplicate && (
        <div role="alert" className="space-y-2 rounded-2xl bg-brand-gold-soft p-4 text-sm">
          <p className="font-semibold">{t("duplicateTitle")}</p>
          <p>{t("duplicateBody")}</p>
          <Link href="/join/status" className="font-semibold text-brand-cyan-strong underline">
            {t("checkStatus")}
          </Link>
        </div>
      )}
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
