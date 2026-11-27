"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * A small disclosure menu for the desktop navigation (a button that shows a list of links):
 * the pattern recommended for site navigation, without a menu library. Closes on Escape (focus
 * back to the button), on a click outside, when focus leaves it and after a link is followed.
 */
export function NavDisclosure({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  /** The links (`<li>` items). */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`group ${className}`}
      >
        {label}
        <ChevronDown
          className="size-3.5 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </button>
      <ul
        id={id}
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className="absolute top-full left-0 z-50 mt-1 min-w-48 rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-lift ring-1 ring-border"
      >
        {children}
      </ul>
    </div>
  );
}
