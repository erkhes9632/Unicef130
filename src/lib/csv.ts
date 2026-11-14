/**
 * RFC 4180 CSV with a UTF-8 BOM. Cells that start with = + - @ (or tab/CR) are prefixed with "'"
 * to prevent spreadsheet formula injection (plain numbers/phone numbers like "+97688112233" are
 * left alone — they are not formulas).
 */
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d[\d\s-]*$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]) {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
