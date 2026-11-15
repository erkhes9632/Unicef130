import { mnMN } from "@clerk/localizations";

/**
 * Clerk components follow the site theme: the variables point at our CSS tokens
 * (src/app/globals.css), so light and dark mode switch together with the rest of the page.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--primary-foreground)",
    colorBackground: "var(--card)",
    colorForeground: "var(--foreground)",
    colorNeutral: "var(--foreground)",
    colorMuted: "var(--muted)",
    colorMutedForeground: "var(--muted-foreground)",
    colorInput: "var(--background)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorRing: "var(--ring)",
    colorDanger: "var(--destructive)",
    colorModalBackdrop: "rgb(11 18 32 / 0.6)",
    fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    headerTitle: "font-heading",
    formButtonPrimary: "font-semibold",
  },
};

/**
 * Clerk's Mongolian localization covers the sign-in screens we use; the strings below fill its
 * gaps and use the site's wording ("И-мэйл", polite forms).
 */
export const clerkLocalizationMn = {
  ...mnMN,
  locale: "mn-MN",
  formFieldLabel__emailAddress: "И-мэйл хаяг",
  formFieldInputPlaceholder__emailAddress: "И-мэйл хаягаа оруулна уу",
  socialButtonsBlockButton: "{{provider|titleize}}-ээр нэвтрэх",
  socialButtonsBlockButtonManyInView: "{{provider|titleize}}",
  badge__you: "Та",
  signIn: {
    ...mnMN.signIn,
    start: {
      ...mnMN.signIn?.start,
      title: "Нэвтрэх",
      titleCombined: "Нэвтрэх",
      subtitle: "Google эсвэл и-мэйлээр нэвтэрнэ үү",
      subtitleCombined:
        "Google эсвэл и-мэйлээр нэвтэрнэ үү. Анх удаа бол бүртгэл автоматаар үүснэ.",
      actionText: "",
      actionLink: "",
    },
    emailCode: {
      ...mnMN.signIn?.emailCode,
      title: "И-мэйлээ шалгана уу",
      subtitle: "Таны и-мэйл рүү илгээсэн 6 оронтой кодыг оруулна уу",
    },
  },
  signUp: {
    ...mnMN.signUp,
    emailCode: {
      ...mnMN.signUp?.emailCode,
      title: "И-мэйлээ баталгаажуулна уу",
      subtitle: "Таны и-мэйл рүү илгээсэн 6 оронтой кодыг оруулна уу",
      formSubtitle: "Таны и-мэйл рүү илгээсэн 6 оронтой кодыг оруулна уу",
    },
  },
  userButton: {
    ...mnMN.userButton,
    action__manageAccount: "Бүртгэлийн тохиргоо",
    action__signOut: "Гарах",
    action__openUserMenu: "Хэрэглэгчийн цэс нээх",
    action__closeUserMenu: "Хэрэглэгчийн цэс хаах",
  },
  unstable__errors: {
    ...mnMN.unstable__errors,
    too_many_requests: "Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.",
    form_code_incorrect: "Код буруу байна.",
    form_identifier_not_found: "Ийм и-мэйлтэй бүртгэл олдсонгүй.",
    form_param_format_invalid__email_address: "И-мэйл хаяг буруу байна.",
    form_identifier_exists__email_address: "Энэ и-мэйлээр бүртгэл аль хэдийн үүссэн байна.",
  },
};
