import { BrandLockup } from "@/components/brand/brand-lockup";

/** Centered card used by the login, two-factor, invitation and password-reset screens. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
        <div className="flex justify-center">
          <BrandLockup size={40} wrapText />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
        {footer && <div className="text-center text-xs text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
