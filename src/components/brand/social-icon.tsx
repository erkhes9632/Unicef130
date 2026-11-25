import { Globe } from "lucide-react";
import type { SocialPlatform } from "@/lib/settings/types";
import { socialIconPaths, type IconPlatform } from "./social-icon-paths";

export function SocialIcon({
  platform,
  className,
}: {
  platform: SocialPlatform | IconPlatform;
  className?: string;
}) {
  if (platform === "website") return <Globe aria-hidden="true" className={className} />;
  const icon = socialIconPaths[platform];
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={icon.path} />
    </svg>
  );
}

/** Display name of a platform ("website" is localized by the caller when needed). */
export function socialTitle(platform: SocialPlatform, websiteLabel = "Website") {
  return platform === "website" ? websiteLabel : socialIconPaths[platform].title;
}
