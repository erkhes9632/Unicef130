/**
 * Which public URLs can be answered with the shared 404 page without rendering anything
 * (Free plan: an uncached render costs far more than 10 ms, and every random URL used to be a
 * new render). worker.ts asks this before OpenNext:
 * - "app": a real route (or something that is not a page) → the app as usual;
 * - "slug": a detail page → the app only if the slug (or an old slug) exists in D1;
 * - "missing": no route can match → the static 404 page (public/errors).
 * The route list is checked against src/app/[locale] by tests/not-found-route.test.ts.
 */

export type RouteCheck =
  | { kind: "app" }
  | { kind: "missing"; locale: "mn" | "en" }
  | { kind: "slug"; locale: "mn" | "en"; table: "news" | "events" | "albums"; slug: string };

/** First path segments of the public pages (single-segment pages and section roots). */
export const PAGE_SEGMENTS = [
  "about",
  "impact",
  "news",
  "events",
  "gallery",
  "members",
  "faq",
  "support",
  "privacy",
  "search",
  "join",
  "me",
  "sign-in",
  "sign-out",
  // Redirects (next.config.ts) and the shared 404 page itself.
  "contact",
] as const;

/** Sections whose second segment is a slug, and the table that holds it. */
const SLUG_SECTIONS = { news: "news", events: "events", gallery: "albums" } as const;
/** Sections whose second segment is a school year ("2025-2026"). */
const YEAR_SECTIONS = new Set(["impact", "members"]);
/** Sections that own every deeper path (account areas: the app decides). */
const OPEN_SECTIONS = new Set(["me", "sign-in", "join"]);

const NOT_PAGES = /^\/(?:_next|api|admin|auth|media|brand|cdn-cgi|mn)(?:\/|$)/;

export function checkRoute(pathname: string): RouteCheck {
  if (NOT_PAGES.test(pathname) || /\.[^/]+$/.test(pathname)) return { kind: "app" };
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const locale = en ? "en" : "mn";
  const parts = (en ? pathname.slice(3) : pathname).split("/").filter(Boolean);
  if (parts.length === 0) return { kind: "app" };
  const [section, second, ...rest] = parts as [string, ...string[]];
  if (!(PAGE_SEGMENTS as readonly string[]).includes(section)) return { kind: "missing", locale };
  if (second === undefined || OPEN_SECTIONS.has(section)) return { kind: "app" };
  if (rest.length > 0) return { kind: "missing", locale };
  if (YEAR_SECTIONS.has(section))
    return /^\d{4}-\d{4}$/.test(second) ? { kind: "app" } : { kind: "missing", locale };
  const table = SLUG_SECTIONS[section as keyof typeof SLUG_SECTIONS];
  if (!table) return { kind: "missing", locale };
  let slug: string;
  try {
    slug = decodeURIComponent(second);
  } catch {
    return { kind: "missing", locale };
  }
  return slug.length > 0 && slug.length <= 200
    ? { kind: "slug", locale, table, slug }
    : { kind: "missing", locale };
}

/** The static 404 page of a locale (public/errors, built by scripts/build-404.ts). */
export const notFoundPath = (locale: "mn" | "en") =>
  locale === "en" ? "/errors/404-en.html" : "/errors/404.html";
