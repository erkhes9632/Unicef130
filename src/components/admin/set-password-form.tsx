"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/admin/action-state";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";

/** "Choose your password" form used by the invitation and password-reset links. */
export function SetPasswordForm({
  action,
  askName,
  submitLabel,
}: {
  action: (prev: ActionState, data: FormData) => Promise<ActionState>;
  askName: boolean;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Controlled, so the name survives the form reset after a failed attempt.
  const [name, setName] = useState("");
  const errors = Object.values(state.fieldErrors ?? {}).flatMap((v) => v ?? []);
  return (
    <form action={formAction} className="space-y-4">
      {askName && (
        <div className="space-y-2">
          <Label htmlFor="name">Таны нэр</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">Шинэ нууц үг</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          Дор хаяж {MIN_PASSWORD_LENGTH} тэмдэгт. Өөр газар ашигладаггүй нууц үг сонгоорой.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="repeat">Нууц үгээ давтана уу</Label>
        <Input id="repeat" name="repeat" type="password" autoComplete="new-password" required />
      </div>
      {(state.message || errors.length > 0) && !state.ok && (
        <div
          role="alert"
          className="space-y-1 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          {errors.length > 0 ? errors.map((e) => <p key={e}>{e}</p>) : <p>{state.message}</p>}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />} {submitLabel}
      </Button>
    </form>
  );
}
