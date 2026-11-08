"use client";

import { useEffect } from "react";

/**
 * Keeps <html lang> in sync after client-side locale switches (the root layout is not
 * re-rendered on soft navigation, so the server-rendered `lang` would stay stale).
 */
export function HtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
