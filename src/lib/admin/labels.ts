import { defaultHelpOptions, type HelpOptionItem } from "@/lib/settings/types";

/** Mongolian labels shared by admin server and client components. */
export const categoryOptions = [
  { value: "activity", label: "Нөлөөлөл" },
  { value: "education", label: "Боловсрол" },
  { value: "charity", label: "Хандив" },
  { value: "announcement", label: "Зарлал" },
] as const;

export const categoryLabel: Record<string, string> = Object.fromEntries(
  categoryOptions.map((c) => [c.value, c.label]),
);

export const memberGroupLabel = { leadership: "Удирдлага", member: "Гишүүн" } as const;

export const applicationStatusLabel = {
  new: "Шинэ",
  accepted: "Зөвшөөрсөн",
  rejected: "Татгалзсан",
} as const;

/**
 * Mongolian labels for join-form help options, keyed by option key. Current options come from
 * admin settings; defaults cover keys of options that were removed later.
 */
export function helpOptionLabels(current: HelpOptionItem[]): Record<string, string> {
  return Object.fromEntries(
    [...defaultHelpOptions, ...current].map((o) => [o.key, o.label] as const),
  );
}
