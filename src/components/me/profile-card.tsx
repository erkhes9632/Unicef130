import { UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { saveMyProfile } from "@/app/[locale]/me/actions";
import { getDb } from "@/db";
import { classRequiredFor } from "@/lib/users/profile";
import { currentClassList } from "@/lib/users/profile-ops";
import { findUser } from "@/lib/users/sync";
import { cn } from "@/lib/utils";
import { ProfileForm, type ProfileFormLabels } from "./profile-form";

/** Labels of the profile form in the page language (also used by the admin dialog, in mn). */
export async function profileLabels(locale: "mn" | "en"): Promise<ProfileFormLabels> {
  const t = await getTranslations({ locale, namespace: "Me.profile" });
  return {
    lastName: t("lastName"),
    firstName: t("firstName"),
    className: t("className"),
    classHint: t("classHint"),
    classOptional: t("classOptional"),
    email: t("email"),
    emailNote: t("emailNote"),
    save: t("save"),
    saved: t("saved"),
    chooseClass: t("chooseClass"),
    errors: Object.fromEntries(
      (
        [
          "required",
          "tooLong",
          "nameChars",
          "className",
          "rate",
          "unauthenticated",
          "forbidden",
          "notFound",
          "server",
        ] as const
      ).map((k) => [k, t(`errors.${k}`)]),
    ),
  };
}

/**
 * Rows from before first/last names were stored separately: the old display name was
 * "Нэр Овог" (Clerk order), so the first word is the first name.
 */
export function splitLegacyName(row: { name: string; firstName: string; lastName: string }) {
  if (row.firstName || row.lastName) return { firstName: row.firstName, lastName: row.lastName };
  const [first = "", ...rest] = row.name.trim().split(/\s+/);
  return { firstName: first, lastName: rest.join(" ") };
}

/** «Миний мэдээлэл»: every signed-in person edits their own name and class here. */
export async function ProfileCard({
  userId,
  role,
  locale,
  className,
}: {
  userId: string;
  role: string | null;
  locale: "mn" | "en";
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: "Me.profile" });
  const db = await getDb();
  const [row, classes, labels] = await Promise.all([
    findUser(db, userId),
    currentClassList(db),
    profileLabels(locale),
  ]);
  if (!row) return null;
  return (
    <section
      id="profile"
      aria-labelledby="me-profile"
      className={cn(
        "scroll-mt-24 space-y-4 rounded-[2rem] bg-card p-6 ring-1 ring-border",
        className,
      )}
    >
      <h2 id="me-profile" className="flex items-center gap-2 text-xl font-extrabold">
        <UserRound className="size-5 text-brand-cyan-strong" aria-hidden="true" />
        {t("title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <ProfileForm
        action={saveMyProfile}
        initial={{ ...splitLegacyName(row), className: row.className }}
        email={row.email}
        classes={classes}
        classRequired={classRequiredFor(role)}
        labels={labels}
      />
    </section>
  );
}
