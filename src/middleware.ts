import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// NOTE: Next 16 renamed middleware → proxy (Node runtime). OpenNext Cloudflare only supports
// edge middleware reliably, so we intentionally keep `middleware.ts` (edge).
export default createMiddleware(routing);

export const config = {
  // Skip admin, API, Next internals and any file with an extension (images, robots.txt, ...).
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
