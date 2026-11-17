"use client";

import { FileText, LogOut, ShieldCheck, UserRound } from "lucide-react";
import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";

const icons = { admin: ShieldCheck, me: UserRound, application: FileText };

export type AccountLink = {
  href: string;
  label: string;
  icon: keyof typeof icons;
  /** Public page under the current locale (/me, /join); /admin is not localized. */
  localized?: boolean;
};

/** Signed-in account menu of the public header (data comes from the server, no Clerk here). */
export function AccountDropdown({
  links,
  label,
  signOut,
}: {
  links: AccountLink[];
  label: string;
  signOut: { href: string; label: string };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          className="ml-1 rounded-full bg-brand-cyan-soft text-brand-cyan-strong hover:bg-brand-cyan-soft/70"
        >
          <UserRound className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {links.map(({ href, label: text, icon, localized }) => {
          const Icon = icons[icon];
          const body = (
            <>
              <Icon aria-hidden="true" /> {text}
            </>
          );
          return (
            <DropdownMenuItem key={href} asChild>
              {localized ? (
                <Link href={href}>{body}</Link>
              ) : (
                <NextLink href={href}>{body}</NextLink>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* No prefetch: the page signs the visitor out as soon as it opens. */}
          <Link href={signOut.href} prefetch={false}>
            <LogOut aria-hidden="true" /> {signOut.label}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
