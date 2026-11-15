"use client";

import {
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  MessagesSquare,
  Search,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { lookupApplicationStatus, type StatusLookupResult } from "@/app/actions/join-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/dates/format";
import { Turnstile } from "./turnstile";

const icons = {
  received: Clock,
  interview: MessagesSquare,
  accepted: CheckCircle2,
  waitlist: Hourglass,
  declined: XCircle,
} as const;

export function StatusLookupForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const t = useTranslations("JoinStatus");
  const locale = useLocale() as Locale;
  const [pending, start] = useTransition();
  const [result, setResult] = useState<StatusLookupResult | null>(null);
  const [token, setToken] = useState("");
  // Tokens are single-use: a new key remounts the widget for the next lookup.
  const [widgetKey, setWidgetKey] = useState(0);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!token) {
            setResult({ ok: false, error: "captcha" });
            return;
          }
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await lookupApplicationStatus({
              code: String(data.get("code") ?? ""),
              last4: String(data.get("last4") ?? ""),
              turnstileToken: token,
            });
            setToken("");
            setWidgetKey((k) => k + 1);
            setResult(res);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="status-code">{t("code")}</Label>
          <Input
            id="status-code"
            name="code"
            required
            placeholder="UC-7K3M"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={10}
            className="font-mono tracking-widest uppercase"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status-last4">{t("last4")}</Label>
          <Input
            id="status-last4"
            name="last4"
            required
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            autoComplete="off"
            placeholder="1234"
            className="max-w-32 font-mono tracking-widest"
          />
        </div>
        <Turnstile
          key={widgetKey}
          siteKey={turnstileSiteKey}
          onToken={setToken}
          onError={() => setResult({ ok: false, error: "unavailable" })}
          action="status"
        />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Search />} {t("submit")}
        </Button>
      </form>

      <div aria-live="polite">
        {result && !result.ok && (
          <p
            role="alert"
            className="rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive"
          >
            {t(`errors.${result.error}`)}
          </p>
        )}
        {result?.ok &&
          (() => {
            const Icon = icons[result.status];
            return (
              <div className="space-y-2 rounded-2xl bg-brand-cyan-soft p-5">
                <p className="text-sm text-muted-foreground">
                  {t("greeting", { name: result.firstName })} ·{" "}
                  {t("submitted", { date: formatDate(locale, result.submittedAt, "long") })}
                </p>
                <p className="flex items-center gap-2 text-xl font-extrabold">
                  <Icon className="size-6 text-brand-cyan-strong" aria-hidden="true" />
                  {t(`status.${result.status}.title`)}
                </p>
                <p>{t(`status.${result.status}.body`)}</p>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
