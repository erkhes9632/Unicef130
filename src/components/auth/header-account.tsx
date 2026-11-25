import { getTranslations } from "next-intl/server";
import { HeaderAccountClient } from "./header-account-client";

/**
 * Header account control for public pages. The page is cached HTML, so the sign-in state is
 * read in the browser (see lib/auth/role-hint.ts); no Clerk code is loaded here.
 */
export async function HeaderAccount() {
  const t = await getTranslations("Auth");
  return (
    <HeaderAccountClient
      labels={{
        signIn: t("signIn"),
        admin: t("menuAdmin"),
        me: t("menuMe"),
        application: t("menuApplication"),
        account: t("accountMenu"),
        signOut: t("signOut"),
      }}
    />
  );
}
