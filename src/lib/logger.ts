/**
 * The one place that writes logs. Each entry is a single JSON line, so Cloudflare Workers Logs
 * can filter by `level` / `scope` and show the extra fields as columns.
 *
 *   logger.error("join", "failed to store application", err);
 *   logger.info("retention", "deleted expired applications", { count: 3 });
 *
 * Never pass personal data (names, e-mails, phone numbers, message text): log ids instead.
 * Works on the server, in the Worker and in the browser (client error boundaries).
 */

type Level = "debug" | "info" | "warn" | "error";

/** Error → plain object (Errors serialize to `{}` in JSON). */
function serializeError(err: unknown) {
  if (err instanceof Error) {
    const digest = (err as { digest?: unknown }).digest;
    return {
      name: err.name,
      message: err.message,
      ...(typeof digest === "string" ? { digest } : {}),
      ...(err.stack ? { stack: err.stack.split("\n").slice(0, 8).join("\n") } : {}),
    };
  }
  return { message: String(err) };
}

/** Third argument: an Error / unknown thrown value, or a record of extra fields. */
export function formatEntry(level: Level, scope: string, message: string, extra?: unknown) {
  const entry: Record<string, unknown> = { level, scope, msg: message };
  if (extra instanceof Error || (extra !== undefined && typeof extra !== "object")) {
    entry.error = serializeError(extra);
  } else if (extra && typeof extra === "object") {
    for (const [key, value] of Object.entries(extra))
      entry[key] = value instanceof Error ? serializeError(value) : value;
  }
  return JSON.stringify(entry);
}

function write(level: Level, scope: string, message: string, extra?: unknown) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = formatEntry(level, scope, message, extra);
  /* eslint-disable no-console -- this module is the only console writer */
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
  /* eslint-enable no-console */
}

export const logger = {
  debug: (scope: string, message: string, extra?: unknown) => write("debug", scope, message, extra),
  info: (scope: string, message: string, extra?: unknown) => write("info", scope, message, extra),
  warn: (scope: string, message: string, extra?: unknown) => write("warn", scope, message, extra),
  error: (scope: string, message: string, extra?: unknown) => write("error", scope, message, extra),
};
