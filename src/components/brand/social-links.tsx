import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import type { SocialLink } from "@/lib/settings/types";
import { cn } from "@/lib/utils";
import { SocialIcon, socialTitle } from "./social-icon";

/** Social links set in admin (only filled ones are passed in). */
export async function SocialLinks({
  socials,
  variant,
  className,
}: {
  socials: SocialLink[];
  variant: "buttons" | "icons";
  className?: string;
}) {
  if (socials.length === 0) return null;
  const t = await getTranslations("Common");
  const website = t("website");

  if (variant === "icons") {
    return (
      <ul className={cn("flex flex-wrap gap-2", className)}>
        {socials.map((s) => (
          <li key={s.platform}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={socialTitle(s.platform, website)}
              title={socialTitle(s.platform, website)}
              className="flex size-10 items-center justify-center rounded-full bg-background text-foreground/80 ring-1 ring-border transition-colors hover:bg-brand-cyan-soft hover:text-foreground"
            >
              <SocialIcon platform={s.platform} className="size-4" />
            </a>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {socials.map((s) => (
        <li key={s.platform}>
          <Button asChild variant="outline" className="bg-background">
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              <SocialIcon platform={s.platform} className="size-4" />
              {socialTitle(s.platform, website)}
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
}
