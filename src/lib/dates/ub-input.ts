import { UB_OFFSET_MS } from "./ub-time";

/**
 * <input type="datetime-local"> values are interpreted as Ulaanbaatar time (UTC+8),
 * regardless of the editor's own device time zone.
 */
export function toUbInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date.getTime() + UB_OFFSET_MS).toISOString().slice(0, 16);
}

export function parseUbInputValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}:00+08:00`);
  return Number.isNaN(ms) ? null : new Date(ms);
}
