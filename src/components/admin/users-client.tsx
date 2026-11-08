"use client";

import { Copy, KeyRound, Loader2, UserPlus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/admin/action-state";
import { AdminField, FormAlert, FormSection, NativeSelect, SubmitButton } from "./form";

type UserRow = { id: string; name: string; email: string; role: string; banned: boolean | null };
type UserActionState = ActionState & { password?: string; email?: string };

function PasswordReveal({ state }: { state: UserActionState }) {
  if (!state.password) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-gold-soft p-3 text-sm">
      <span className="font-semibold">{state.email}:</span>
      <code className="rounded bg-background px-2 py-1 font-mono">{state.password}</code>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          navigator.clipboard.writeText(state.password!).then(() => toast.success("Хуулагдлаа"))
        }
      >
        <Copy /> Хуулах
      </Button>
    </div>
  );
}

export function CreateUserForm({
  action,
}: {
  action: (prev: UserActionState, data: FormData) => Promise<UserActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <FormSection
      title="Шинэ хэрэглэгч"
      description="Нийтийн бүртгэл хаалттай. Зөвхөн админ шинэ хэрэглэгч үүсгэнэ."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert state={state} />
        <PasswordReveal state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Нэр" htmlFor="u-name" required errors={e.name}>
            <Input id="u-name" name="name" required maxLength={100} />
          </AdminField>
          <AdminField label="И-мэйл" htmlFor="u-email" required errors={e.email}>
            <Input id="u-email" name="email" type="email" required />
          </AdminField>
          <AdminField label="Эрх" htmlFor="u-role" errors={e.role}>
            <NativeSelect id="u-role" name="role" defaultValue="editor">
              <option value="editor">Редактор (агуулга засна)</option>
              <option value="admin">Админ (бүх эрх)</option>
            </NativeSelect>
          </AdminField>
          <AdminField
            label="Нууц үг"
            htmlFor="u-password"
            hint="Хоосон бол автоматаар үүсгэнэ (≥10 тэмдэгт)."
            errors={e.password}
          >
            <Input
              id="u-password"
              name="password"
              type="text"
              autoComplete="new-password"
              minLength={10}
            />
          </AdminField>
        </div>
        <SubmitButton>
          <UserPlus /> Үүсгэх
        </SubmitButton>
      </form>
    </FormSection>
  );
}

export function UserRowActions({
  row,
  isSelf,
  setRole,
  setDisabled,
  resetPassword,
}: {
  row: UserRow;
  isSelf: boolean;
  setRole: (role: "admin" | "editor") => Promise<ActionState>;
  setDisabled: (disabled: boolean) => Promise<ActionState>;
  resetPassword: () => Promise<UserActionState>;
}) {
  const [pending, start] = useTransition();
  const [reveal, setReveal] = useState<UserActionState>({});
  const run = (fn: () => Promise<UserActionState>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Амжилттай");
      else toast.error(res.message ?? "Алдаа гарлаа");
      if (res.password) setReveal(res);
    });

  return (
    <li className="space-y-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {row.name} {isSelf && <span className="text-xs text-muted-foreground">(та)</span>}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {row.email}
            <Badge variant={row.role === "admin" ? "default" : "secondary"}>
              {row.role === "admin" ? "Админ" : "Редактор"}
            </Badge>
            {row.banned && <Badge variant="destructive">Идэвхгүй</Badge>}
          </p>
        </div>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {!isSelf && (
          <div className="flex flex-wrap gap-2">
            <NativeSelect
              aria-label="Эрх солих"
              className="h-8 w-auto"
              value={row.role}
              disabled={pending}
              onChange={(e) => run(() => setRole(e.target.value as "admin" | "editor"))}
            >
              <option value="editor">Редактор</option>
              <option value="admin">Админ</option>
            </NativeSelect>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(resetPassword)}
            >
              <KeyRound /> Нууц үг шинэчлэх
            </Button>
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
      <PasswordReveal state={reveal} />
    </li>
  );
}
