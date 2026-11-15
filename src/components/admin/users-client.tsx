"use client";

import { Copy, KeyRound, Loader2, LogOut, ShieldOff, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRole } from "@/db/schema";
import type { ActionState } from "@/lib/admin/action-state";
import { roleDescriptions, roleLabels } from "@/lib/auth/roles";
import { AdminField, FormAlert, FormSection, NativeSelect, SubmitButton } from "./form";

type LinkState = ActionState & { link?: string; email?: string; emailed?: boolean };
const roles = Object.keys(roleLabels) as UserRole[];

/** A freshly created one-time link: shown once, with a copy button. */
function LinkReveal({ state }: { state: LinkState }) {
  if (!state.link) return null;
  const link = state.link;
  return (
    <div className="space-y-2 rounded-xl bg-brand-gold-soft p-3 text-sm">
      <p className="font-semibold">{state.email}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 rounded bg-background px-2 py-1 font-mono text-xs break-all">
          {link}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            navigator.clipboard.writeText(link).then(
              () => toast.success("Холбоос хуулагдлаа"),
              () => toast.error("Хуулж чадсангүй — гараар сонгож хуулна уу"),
            )
          }
        >
          <Copy /> Хуулах
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        72 цаг хүчинтэй, нэг л удаа ашиглагдана. Зөвхөн тухайн хүнд нь (жишээ нь Messenger-ээр)
        илгээнэ үү.
      </p>
    </div>
  );
}

export function InviteUserForm({
  action,
}: {
  action: (prev: LinkState, data: FormData) => Promise<LinkState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <FormSection
      title="Хэрэглэгч урих"
      description="Нийтийн бүртгэл хаалттай. Урилгын холбоосоор орсон хүн нууц үгээ өөрөө тохируулна."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert state={state} />
        <LinkReveal state={state} />
        <AdminField label="И-мэйл" htmlFor="invite-email" required errors={e.email}>
          <Input id="invite-email" name="email" type="email" required autoComplete="off" />
        </AdminField>
        <AdminField label="Эрх" htmlFor="invite-role" errors={e.role}>
          <NativeSelect id="invite-role" name="role" defaultValue="editor">
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]} — {roleDescriptions[r]}
              </option>
            ))}
          </NativeSelect>
        </AdminField>
        <SubmitButton>Урих</SubmitButton>
      </form>
    </FormSection>
  );
}

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean | null;
  twoFactorEnabled: boolean | null;
  sessions: number;
};

export function UserRowActions({
  row,
  isSelf,
  setRole,
  setDisabled,
  createResetLink,
  revokeSessions,
  resetTwoFactor,
}: {
  row: UserRow;
  isSelf: boolean;
  setRole: (role: UserRole) => Promise<ActionState>;
  setDisabled: (disabled: boolean) => Promise<ActionState>;
  createResetLink: () => Promise<LinkState>;
  revokeSessions: () => Promise<ActionState>;
  resetTwoFactor: () => Promise<ActionState>;
}) {
  const [pending, start] = useTransition();
  const [reveal, setReveal] = useState<LinkState>({});
  const run = (fn: () => Promise<LinkState>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Амжилттай");
      else toast.error(res.message ?? "Алдаа гарлаа");
      if (res.link) setReveal(res);
    });
  const role = roles.includes(row.role as UserRole) ? (row.role as UserRole) : null;

  return (
    <li className="space-y-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {row.name} {isSelf && <span className="text-xs text-muted-foreground">(та)</span>}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="break-all">{row.email}</span>
            <Badge variant={row.role === "admin" ? "default" : "secondary"}>
              {role ? roleLabels[role] : row.role}
            </Badge>
            <Badge variant="outline">{row.twoFactorEnabled ? "2FA идэвхтэй" : "2FA-гүй"}</Badge>
            {row.sessions > 0 && <span>{row.sessions} идэвхтэй session</span>}
            {row.banned && <Badge variant="destructive">Идэвхгүй</Badge>}
          </p>
        </div>
        {pending && <Loader2 className="size-4 animate-spin" aria-label="Түр хүлээнэ үү" />}
        {!isSelf && (
          <div className="flex flex-wrap gap-2">
            <NativeSelect
              aria-label={`Эрх солих: ${row.email}`}
              className="h-8 w-auto"
              value={role ?? ""}
              disabled={pending}
              onChange={(e) => run(() => setRole(e.target.value as UserRole))}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </NativeSelect>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(createResetLink)}
            >
              <KeyRound /> Нууц үг сэргээх холбоос
            </Button>
            {row.sessions > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(revokeSessions)}
              >
                <LogOut /> Албадан гаргах
              </Button>
            )}
            {row.twoFactorEnabled && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`${row.email} хэрэглэгчийн 2FA-г арилгах уу?`))
                    run(resetTwoFactor);
                }}
              >
                <ShieldOff /> 2FA арилгах
              </Button>
            )}
            <Button
              size="sm"
              variant={row.banned ? "outline" : "destructive"}
              disabled={pending}
              onClick={() => run(() => setDisabled(!row.banned))}
            >
              {row.banned ? "Идэвхжүүлэх" : "Идэвхгүй болгох"}
            </Button>
          </div>
        )}
      </div>
      <LinkReveal state={reveal} />
    </li>
  );
}

export type PendingLink = {
  id: string;
  kind: "invite" | "reset";
  email: string;
  role: string | null;
  expiresLabel: string;
};

export function PendingLinkRow({
  link,
  revoke,
}: {
  link: PendingLink;
  revoke: () => Promise<ActionState>;
}) {
  const [pending, start] = useTransition();
  const role = roles.includes(link.role as UserRole) ? roleLabels[link.role as UserRole] : null;
  return (
    <li className="flex flex-wrap items-center gap-3 p-3 text-sm sm:p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold break-all">{link.email}</p>
        <p className="text-xs text-muted-foreground">
          {link.kind === "invite" ? `Урилга${role ? ` · ${role}` : ""}` : "Нууц үг сэргээх холбоос"}{" "}
          · {link.expiresLabel} хүртэл хүчинтэй
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await revoke();
            if (res.ok) toast.success(res.message ?? "Цуцлагдлаа");
            else toast.error(res.message ?? "Алдаа гарлаа");
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
        Цуцлах
      </Button>
    </li>
  );
}
