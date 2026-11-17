/** Logs are single JSON lines with level, scope and message; errors keep their name/message. */
import { expect, test } from "bun:test";
import { formatEntry } from "@/lib/logger";

test("plain fields and nested errors", () => {
  const entry = JSON.parse(
    formatEntry("info", "retention", "deleted", { count: 3, error: new TypeError("x") }),
  );
  expect(entry).toMatchObject({ level: "info", scope: "retention", msg: "deleted", count: 3 });
  expect(entry.error).toMatchObject({ name: "TypeError", message: "x" });
});

test("a thrown value becomes `error`, including Next.js digests", () => {
  const err = Object.assign(new Error("boom"), { digest: "123" });
  const entry = JSON.parse(formatEntry("error", "page", "render failed", err));
  expect(entry.error).toMatchObject({ name: "Error", message: "boom", digest: "123" });
  expect(JSON.parse(formatEntry("error", "x", "y", "just text")).error).toEqual({
    message: "just text",
  });
});

test("no extra → only the three base fields", () => {
  expect(Object.keys(JSON.parse(formatEntry("warn", "a", "b")))).toEqual(["level", "scope", "msg"]);
});
