import type messages from "../messages/mn.json";
import type { routing } from "@/i18n/routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}

declare global {
  /** Custom session-token claims (Clerk dashboard → Sessions → Customize session token). */
  interface CustomJwtSessionClaims {
    role?: "admin" | "member" | null;
  }
}
