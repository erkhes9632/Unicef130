"use client";

import { useEffect } from "react";

/**
 * Admin-wide helpers for forms marked `data-guard`:
 * - leaving the page (reload, close, or an in-app link) with unsaved edits asks first;
 * - ⌘S / Ctrl+S saves the form that has focus (or the only guarded form).
 * A form is clean again after it is submitted.
 */
export function UnsavedChangesGuard() {
  useEffect(() => {
    const dirty = new Set<HTMLFormElement>();
    const guarded = (t: EventTarget | null) =>
      t instanceof Element ? t.closest<HTMLFormElement>("form[data-guard]") : null;

    const onInput = (e: Event) => {
      const f = guarded(e.target);
      if (f) dirty.add(f);
    };
    const onSubmit = (e: Event) => {
      const f = guarded(e.target);
      if (f) dirty.delete(f);
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      for (const f of dirty) if (!f.isConnected) dirty.delete(f);
      if (dirty.size > 0) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      for (const f of dirty) if (!f.isConnected) dirty.delete(f);
      if (dirty.size === 0 || e.defaultPrevented || e.metaKey || e.ctrlKey || e.button !== 0)
        return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.getAttribute("target") === "_blank") return;
      if (!window.confirm("Хадгалаагүй өөрчлөлт байна. Хуудаснаас гарах уу?")) {
        e.preventDefault();
        e.stopPropagation();
      } else dirty.clear();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s") return;
      const forms = [...document.querySelectorAll<HTMLFormElement>("form[data-guard]")];
      const form = guarded(document.activeElement) ?? (forms.length === 1 ? forms[0] : null);
      if (!form) return;
      e.preventDefault();
      form.requestSubmit();
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);
  return null;
}
