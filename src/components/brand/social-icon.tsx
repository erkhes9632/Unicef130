import type { SocialPlatform } from "@/config/site";
import { socialIconPaths } from "./social-icon-paths";

export function SocialIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const icon = socialIconPaths[platform];
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={icon.path} />
    </svg>
  );
}

export function socialTitle(platform: SocialPlatform) {
  return socialIconPaths[platform].title;
}
