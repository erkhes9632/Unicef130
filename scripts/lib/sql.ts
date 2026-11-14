/**
 * Helpers for local maintenance scripts (Bun). They build SQL and run it against the
 * LOCAL D1 via wrangler. Production writes go through scripts/create-admin.ts only.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type SqlValue = string | number | boolean | null | undefined | Date | object;

export function sqlValue(v: SqlValue): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (v instanceof Date) return String(v.getTime());
  const str = typeof v === "string" ? v : JSON.stringify(v);
  return `'${str.replace(/'/g, "''")}'`;
}

export function insert(table: string, row: Record<string, SqlValue>) {
  const cols = Object.keys(row);
  return `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols
    .map((c) => sqlValue(row[c]))
    .join(", ")});`;
}

/** Executes SQL against the local D1 database (binding DB). */
export async function runLocalSql(statements: string[], label: string) {
  const dir = mkdtempSync(join(tmpdir(), "unicef130-"));
  const file = join(dir, `${label}.sql`);
  writeFileSync(file, statements.join("\n") + "\n");
  try {
    const proc = Bun.spawn(
      ["bunx", "wrangler", "d1", "execute", "DB", "--local", `--file=${file}`],
      {
        stdout: "inherit",
        stderr: "inherit",
      },
    );
    const code = await proc.exited;
    if (code !== 0) throw new Error(`wrangler d1 execute failed with exit code ${code}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
