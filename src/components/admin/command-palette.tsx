"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { adminSearch, type AdminSearchHit } from "@/app/admin/(panel)/search-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { adminNav } from "./admin-nav";

const quickActions: AdminSearchHit[] = [
  { href: "/admin/news/new", label: "Шинэ мэдээ", kind: "Үйлдэл" },
  { href: "/admin/events/new", label: "Шинэ арга хэмжээ", kind: "Үйлдэл" },
  { href: "/admin/gallery/new", label: "Шинэ цомог", kind: "Үйлдэл" },
  { href: "/admin/members/new", label: "Шинэ гишүүн", kind: "Үйлдэл" },
  { href: "/admin/recruitment/new", label: "Шинэ элсэлт", kind: "Үйлдэл" },
];

/**
 * ⌘K / Ctrl+K: jump to any admin page, start a new item, or find a post, event, album, member
 * or account by name. Arrow keys + Enter to open.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<AdminSearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setHits([]);
        setActive(0);
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const local = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("mn");
    const pages = adminNav.map((n) => ({ href: n.href, label: n.label, kind: "Хэсэг" }));
    const all = [...pages, ...quickActions];
    return q ? all.filter((i) => i.label.toLocaleLowerCase("mn").includes(q)) : all;
  }, [query]);
  const results = [...local, ...hits];

  const search = (value: string) => {
    setQuery(value);
    setActive(0);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(
      () => start(async () => setHits(await adminSearch(value).catch(() => []))),
      200,
    );
  };
  const go = (hit: AdminSearchHit | undefined) => {
    if (!hit) return;
    setOpen(false);
    setQuery("");
    setHits([]);
    router.push(hit.href);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden text-muted-foreground sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search /> Хайх <kbd className="ml-2 rounded bg-muted px-1.5 text-[10px]">⌘K</kbd>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setHits([]);
            setActive(0);
          }
        }}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Хайх, шилжих</DialogTitle>
          <DialogDescription className="sr-only">
            Хэсэг, мэдээ, арга хэмжээ, гишүүн, хэрэглэгч хайна. Сумаар сонгоод Enter дарна.
          </DialogDescription>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => search(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(results.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go(results[active]);
                }
              }}
              placeholder="Хэсэг, мэдээ, гишүүн, и-мэйл…"
              aria-label="Хайх"
              role="combobox"
              aria-expanded="true"
              aria-controls="admin-palette-list"
              aria-activedescendant={results[active] ? `palette-${active}` : undefined}
              className="h-12 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <ul id="admin-palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">Олдсонгүй.</li>
            )}
            {results.map((r, i) => (
              <li
                key={`${r.kind}-${r.href}`}
                id={`palette-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${i === active ? "bg-brand-cyan-soft" : ""}`}
              >
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.kind}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
