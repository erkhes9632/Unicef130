"use client";

import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_SEARCH } from "@/lib/admin/list-limits";
import { cn } from "@/lib/utils";
import { NativeSelect } from "./form";

export type FilterField =
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { type: "date"; name: string; label: string }
  | { type: "toggle"; name: string; label: string };

/** Debounce for the search box (ms). */
const DEBOUNCE = 300;

/**
 * The one filter bar of the admin lists. Filters live in the address (?q=…&role=…), so the back
 * button, refresh and shared links keep working; the server page reads them and returns at most
 * one page of rows.
 *
 * - Search: applies 300 ms after typing stops, from 2 characters (empty = everything). Nothing
 *   fires while an IME composition is open. Enter does nothing extra.
 * - Selects, dates and toggles apply at once.
 * - Every change goes to page 1, through `router.replace` in a transition (no history flood; a
 *   newer change replaces a request still in flight). While it loads, the old results stay,
 *   dimmed, and the search box shows a spinner.
 */
export function FilterBar({
  search,
  fields = [],
  count,
  noun,
  emptyText,
  alsoClear = [],
  children,
}: {
  /** Label + placeholder of the search box; omitted = no search box. */
  search?: { label: string; placeholder?: string };
  fields?: FilterField[];
  /** Number of matching rows (all pages). */
  count: number;
  /** "хэрэглэгч" → "12 хэрэглэгч олдлоо". */
  noun: string;
  /** Shown with a "clear" action when filters are on and nothing matches. */
  emptyText: string;
  /** Other address keys that count as filters and are reset by "Цэвэрлэх" (e.g. status tabs). */
  alsoClear?: string[];
  /** The results (server-rendered list). */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const composing = useRef(false);

  const urlQ = params.get("q") ?? "";
  const [text, setText] = useState(urlQ);
  const [waiting, setWaiting] = useState(false);
  // Back/forward or "clear": follow the address unless it is just our own trimmed text.
  const [seenQ, setSeenQ] = useState(urlQ);
  if (urlQ !== seenQ) {
    setSeenQ(urlQ);
    if (urlQ !== text.trim()) setText(urlQ);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const keys = [...(search ? ["q"] : []), ...fields.map((f) => f.name), ...alsoClear];
  const active = keys.some((k) => (params.get(k) ?? "") !== "");

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    if (qs === params.toString()) return;
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function scheduleSearch(value: string) {
    clearTimeout(timer.current);
    const q = value.trim();
    // One character: wait for more (the list keeps the current results).
    if ([...q].length > 0 && [...q].length < MIN_SEARCH) {
      setWaiting(false);
      return;
    }
    setWaiting(true);
    timer.current = setTimeout(() => {
      setWaiting(false);
      apply({ q });
    }, DEBOUNCE);
  }

  function clearAll() {
    clearTimeout(timer.current);
    setWaiting(false);
    setText("");
    apply(Object.fromEntries(keys.map((k) => [k, ""])));
    searchRef.current?.focus();
  }

  const busy = pending || waiting;
  const empty = count === 0;

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="mb-3 flex flex-wrap items-end gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
      >
        {search && (
          <label className="min-w-0 flex-[1_1_16rem] space-y-1 text-xs font-semibold">
            <span>{search.label}</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={searchRef}
                type="search"
                name="q"
                value={text}
                placeholder={search.placeholder}
                autoComplete="off"
                enterKeyHint="search"
                className="pr-10 pl-9"
                onChange={(e) => {
                  setText(e.target.value);
                  if (!composing.current) scheduleSearch(e.target.value);
                }}
                onCompositionStart={() => {
                  composing.current = true;
                  clearTimeout(timer.current);
                }}
                onCompositionEnd={(e) => {
                  composing.current = false;
                  scheduleSearch(e.currentTarget.value);
                }}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2" aria-hidden="true">
                <Loader2
                  className={cn(
                    "size-4 text-muted-foreground motion-safe:animate-spin",
                    !busy && "invisible",
                  )}
                />
              </span>
            </span>
          </label>
        )}
        {fields.map((f) => (
          <label
            key={f.name}
            className={cn(
              "space-y-1 text-xs font-semibold",
              f.type === "toggle" ? "flex min-h-10 items-center gap-2 space-y-0" : "w-full sm:w-48",
            )}
          >
            {f.type !== "toggle" && <span>{f.label}</span>}
            {f.type === "select" && (
              <NativeSelect
                name={f.name}
                className="h-11"
                value={params.get(f.name) ?? ""}
                onChange={(e) => apply({ [f.name]: e.target.value })}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            )}
            {f.type === "date" && (
              <Input
                type="date"
                name={f.name}
                value={params.get(f.name) ?? ""}
                onChange={(e) => apply({ [f.name]: e.target.value })}
              />
            )}
            {f.type === "toggle" && (
              <>
                <input
                  type="checkbox"
                  name={f.name}
                  className="size-5 accent-brand-cyan"
                  checked={params.get(f.name) === "1"}
                  onChange={(e) => apply({ [f.name]: e.target.checked ? "1" : "" })}
                />
                <span className="text-sm font-medium">{f.label}</span>
              </>
            )}
          </label>
        ))}
        {/* The button keeps its place (hidden, not removed), so nothing jumps. */}
        <Button
          type="button"
          variant="ghost"
          onClick={clearAll}
          className={cn(!active && "invisible")}
          aria-hidden={!active}
          tabIndex={active ? 0 : -1}
        >
          <X aria-hidden="true" /> Цэвэрлэх
        </Button>
      </form>

      <p aria-live="polite" className="mb-3 text-sm text-muted-foreground">
        {count} {noun} олдлоо
      </p>

      <div
        aria-busy={pending}
        className={cn("transition-opacity", pending && "pointer-events-none opacity-50")}
      >
        {empty && active ? (
          <div className="rounded-2xl border-2 border-dashed p-8 text-center">
            <p className="text-muted-foreground">{emptyText}</p>
            <Button type="button" variant="outline" className="mt-4" onClick={clearAll}>
              Шүүлтүүрийг цэвэрлэх
            </Button>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
