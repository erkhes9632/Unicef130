"use client";

import { Copy, Loader2, LogOut } from "lucide-react";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { renderSVG } from "uqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/admin/action-state";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { AdminField, FormAlert, SubmitButton } from "./form";

type Action<S extends ActionState = ActionState> = (prev: S, data: FormData) => Promise<S>;

function FieldErrors({ state }: { state: ActionState }) {
  const errors = Object.values(state.fieldErrors ?? {}).flatMap((v) => v ?? []);
  if (errors.length === 0) return null;
  return (
    <ul className="list-disc rounded-xl bg-destructive/10 p-3 pl-8 text-sm text-destructive">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

export function ChangePasswordForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="max-w-md space-y-4">
      <FormAlert state={state} />
      <FieldErrors state={state} />
      <AdminField label="Одоогийн нууц үг" htmlFor="current" required>
        <Input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </AdminField>
      <AdminField
        label="Шинэ нууц үг"
        htmlFor="password"
        required
        hint={`Дор хаяж ${MIN_PASSWORD_LENGTH} тэмдэгт.`}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </AdminField>
      <AdminField label="Шинэ нууц үгээ давтана уу" htmlFor="repeat" required>
        <Input id="repeat" name="repeat" type="password" autoComplete="new-password" required />
      </AdminField>
      <SubmitButton>Нууц үг солих</SubmitButton>
    </form>
  );
}

export function SignOutOthersButton({ action }: { action: () => Promise<ActionState> }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await action();
          if (res.ok) toast.success(res.message ?? "Амжилттай");
          else toast.error(res.message ?? "Алдаа гарлаа");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />} Бусад төхөөрөмжөөс гарах
    </Button>
  );
}

export function BackupCodes({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-2 rounded-xl bg-brand-gold-soft p-4">
      <p className="text-sm font-semibold">
        Нөөц кодууд — утсаа гээвэл эдгээрээр нэвтэрнэ. Код бүр нэг удаа ашиглагдана. Одоо л
        харагдана: хуулж, аюулгүй газар хадгална уу.
      </p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm sm:grid-cols-3">
        {codes.map((c) => (
          <li key={c} className="rounded bg-background px-2 py-1 text-center">
            {c}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          navigator.clipboard.writeText(codes.join("\n")).then(
            () => toast.success("Нөөц кодууд хуулагдлаа"),
            () => toast.error("Хуулж чадсангүй — гараар сонгож хуулна уу"),
          )
        }
      >
        <Copy /> Бүгдийг хуулах
      </Button>
    </div>
  );
}

type SetupState = ActionState & { totpURI?: string; backupCodes?: string[] };

/** Two steps: password → QR code + backup codes → first code from the app. */
export function TwoFactorSetup({ start, confirm }: { start: Action<SetupState>; confirm: Action }) {
  const [setup, startAction] = useActionState(start, {});
  const [done, confirmAction] = useActionState(confirm, {});

  if (setup.totpURI) {
    const secret = new URL(setup.totpURI).searchParams.get("secret") ?? "";
    return (
      <div className="space-y-6">
        <ol className="list-decimal space-y-4 pl-5 text-sm">
          <li>
            Утсан дээрээ authenticator апп (Google Authenticator, Microsoft Authenticator, Authy гэх
            мэт) суулгаад доорх QR кодыг уншуулна.
            <div
              className="mt-3 w-48 rounded-xl bg-white p-3"
              role="img"
              aria-label="Authenticator апп-д уншуулах QR код"
              dangerouslySetInnerHTML={{ __html: renderSVG(setup.totpURI, { border: 1 }) }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              QR уншуулж чадахгүй бол энэ түлхүүрийг гараар оруулна:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono break-all">{secret}</code>
            </p>
          </li>
          <li>{setup.backupCodes && <BackupCodes codes={setup.backupCodes} />}</li>
          <li>
            Апп дээр гарсан 6 оронтой кодыг оруулж баталгаажуулна.
            <form action={confirmAction} className="mt-3 flex max-w-xs flex-col gap-3">
              <FormAlert state={done} />
              <Input
                name="code"
                aria-label="6 оронтой код"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                required
                className="text-center font-mono text-lg tracking-widest"
              />
              <SubmitButton>Идэвхжүүлэх</SubmitButton>
            </form>
          </li>
        </ol>
      </div>
    );
  }
  return (
    <form action={startAction} className="max-w-md space-y-4">
      <FormAlert state={setup} />
      <AdminField label="Нууц үгээ оруулж үргэлжлүүлнэ" htmlFor="tf-password" required>
        <Input
          id="tf-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </AdminField>
      <SubmitButton>Тохируулж эхлэх</SubmitButton>
    </form>
  );
}

type CodesState = ActionState & { backupCodes?: string[] };

export function TwoFactorManage({
  disable,
  regenerate,
  required,
}: {
  disable: Action;
  regenerate: Action<CodesState>;
  required: boolean;
}) {
  const [codes, regenerateAction] = useActionState(regenerate, {});
  const [off, disableAction] = useActionState(disable, {});
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={regenerateAction} className="space-y-3 rounded-xl border p-4">
        <h3 className="font-bold">Нөөц кодуудыг шинэчлэх</h3>
        <FormAlert state={codes} />
        {codes.backupCodes && <BackupCodes codes={codes.backupCodes} />}
        <AdminField label="Нууц үг" htmlFor="codes-password" required>
          <Input
            id="codes-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </AdminField>
        <SubmitButton>Шинэ нөөц код үүсгэх</SubmitButton>
      </form>
      <form action={disableAction} className="space-y-3 rounded-xl border p-4">
        <h3 className="font-bold">2FA-г унтраах</h3>
        <FormAlert state={off} />
        <p className="text-sm text-muted-foreground">
          {required
            ? "Админ эрхэд 2FA заавал шаардлагатай: унтраавал дахин тохируулах хүртэл админ хэсгийг ашиглаж чадахгүй (утас солих үед л хэрэглэнэ)."
            : "Унтраасны дараа зөвхөн нууц үгээр нэвтэрнэ."}
        </p>
        <AdminField label="Нууц үг" htmlFor="off-password" required>
          <Input
            id="off-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </AdminField>
        <SubmitButton>2FA унтраах</SubmitButton>
      </form>
    </div>
  );
}
