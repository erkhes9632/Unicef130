"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyTwoFactorAction, type LoginState } from "../../actions";

export function TwoFactorForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(verifyTwoFactorAction, {});
  const [backup, setBackup] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="backup" value={backup ? "1" : "0"} />
      <div className="space-y-2">
        <Label htmlFor="code">{backup ? "Нөөц код" : "6 оронтой код"}</Label>
        <Input
          key={backup ? "backup" : "totp"}
          id="code"
          name="code"
          inputMode={backup ? "text" : "numeric"}
          autoComplete="one-time-code"
          pattern={backup ? undefined : "[0-9 ]{6,7}"}
          maxLength={backup ? 20 : 7}
          required
          autoFocus
          className="text-center font-mono text-lg tracking-widest"
        />
      </div>
      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Баталгаажуулах
      </Button>
      <button
        type="button"
        onClick={() => setBackup((b) => !b)}
        className="w-full text-center text-sm font-semibold text-brand-cyan-strong hover:underline"
      >
        {backup ? "Authenticator код ашиглах" : "Утас алга уу? Нөөц код ашиглах"}
      </button>
    </form>
  );
}
