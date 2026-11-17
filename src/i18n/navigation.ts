import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware wrappers around Next.js navigation APIs. Use these in public pages.
export const { Link, usePathname, useRouter, getPathname } = createNavigation(routing);
