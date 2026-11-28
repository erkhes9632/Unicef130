import { useLocale } from "next-intl";
import { createNavigation } from "next-intl/navigation";
import { createElement, type ComponentProps } from "react";
import { isAccountPath } from "@/lib/auth/account-paths";
import { routing } from "./routing";

// Locale-aware wrappers around Next.js navigation APIs. Use these in public pages.
const navigation = createNavigation(routing);
export const { usePathname, useRouter, getPathname } = navigation;

type LinkProps = ComponentProps<typeof navigation.Link>;

/**
 * next-intl's Link, except into account areas (/sign-in, /join, /me, /admin, …): those are a
 * plain <a>, a full page load, so the page gets the proxy's CSP that lets Clerk load (see
 * src/lib/auth/account-paths.ts). Everything else stays a client-side navigation.
 */
export function Link(props: LinkProps) {
  const current = useLocale();
  const { href } = props;
  const pathname = typeof href === "string" ? href : (href.pathname ?? "");
  if (!isAccountPath(pathname)) return createElement(navigation.Link, props);
  // Props that only mean something to a client-side navigation are not passed to <a>.
  const anchor: Record<string, unknown> = { ...props };
  for (const key of ["href", "locale", "prefetch", "replace", "scroll", "shallow", "onNavigate"])
    delete anchor[key];
  const locale = props.locale;
  return createElement("a", {
    ...anchor,
    href: getPathname({
      href:
        typeof href === "string"
          ? href
          : { pathname, query: href.query as Record<string, string> | undefined },
      locale: locale ?? current,
    }),
  });
}
