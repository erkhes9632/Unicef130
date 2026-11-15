import type { Metadata } from "next";
import { FormSection } from "@/components/admin/form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TwoFactorManage, TwoFactorSetup } from "@/components/admin/profile-client";
import { needsTwoFactorSetup } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/data/settings";
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateBackupCodes,
  startTwoFactorSetup,
} from "../actions";

export const metadata: Metadata = { title: "2 шатлалт баталгаажуулалт" };

export default async function TwoFactorPage() {
  const me = await requireUser(undefined, { allowWithoutTwoFactor: true });
  const { security } = await getSiteSettings();
  const forced = needsTwoFactorSetup(me, security.requireAdminTwoFactor);

  return (
    <>
      <AdminPageHeader
        title="2 шатлалт баталгаажуулалт (2FA)"
        description="Нэвтрэх бүрд нууц үгээс гадна утасны authenticator апп-ын 6 оронтой код шаардана."
      />
      {forced && (
        <p
          role="alert"
          className="mb-6 max-w-3xl rounded-xl bg-brand-gold-soft p-4 text-sm font-medium"
        >
          Админ эрхтэй бүртгэлд 2FA заавал шаардлагатай. Тохируулж дуустал админ хэсгийн бусад
          хуудас нээгдэхгүй.
        </p>
      )}
      <div className="max-w-3xl">
        {me.twoFactorEnabled ? (
          <FormSection title="2FA идэвхтэй байна">
            <TwoFactorManage
              disable={disableTwoFactor}
              regenerate={regenerateBackupCodes}
              required={security.requireAdminTwoFactor && me.role === "admin"}
            />
          </FormSection>
        ) : (
          <FormSection title="Тохируулах">
            <TwoFactorSetup start={startTwoFactorSetup} confirm={confirmTwoFactorSetup} />
          </FormSection>
        )}
      </div>
    </>
  );
}
