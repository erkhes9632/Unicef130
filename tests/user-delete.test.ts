/**
 * Deleting an account (admin delete, self-delete, user.deleted webhook) removes personal data
 * but keeps volunteer hours as anonymous totals; the retention job deletes rejected
 * applications N days after their period closed.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { getTableName, type Table } from "drizzle-orm";

const calls: { op: string; table?: string; arg?: unknown }[] = [];
const queued: unknown[] = [];
const logged: string[] = [];

/** Fake Drizzle client recording (operation, table, argument). */
function chain(root = false, table?: string): unknown {
  return new Proxy(() => {}, {
    get(_t, prop) {
      if (prop === "then") {
        if (root) return undefined;
        const next = queued.length ? queued.shift() : [];
        return (resolve: (v: unknown) => void) => resolve(next);
      }
      return (...args: unknown[]) => {
        let t = table;
        if (["insert", "update", "delete", "from"].includes(String(prop)) && args[0]) {
          try {
            t = getTableName(args[0] as Table);
          } catch {
            /* not a table */
          }
        }
        calls.push({ op: String(prop), table: t, arg: args[0] });
        return chain(false, t);
      };
    },
  });
}
mock.module("@/lib/admin/activity", () => ({
  logActivity: async (_actor: unknown, action: string) => void logged.push(action),
  shortId: (id: string) => id.slice(0, 8),
}));
mock.module("@/lib/users/clerk-admin", () => ({ setRole: async () => {} }));

const { removeUserData, ANONYMIZED_MEMBER } = await import("@/lib/users/delete");
const { purgeExpiredRejected } = await import("@/lib/recruitment/retention");
const { retentionCutoff, DEFAULT_REJECTED_RETENTION_DAYS } =
  await import("@/lib/recruitment/logic");
const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
const toSql = (where: unknown) => new SQLiteSyncDialect().sqlToQuery(where as SQL);

beforeEach(() => {
  calls.length = 0;
  queued.length = 0;
  logged.length = 0;
});

const op = (name: string, table: string) => calls.filter((c) => c.op === name && c.table === table);

describe("account deletion", () => {
  test("applications deleted, member anonymized (hours kept), sign-ups and account removed", async () => {
    queued.push(
      [{ id: "app1" }, { id: "app2" }], // the account's applications
      [{ id: "app1" }, { id: "app2" }], // deleted applications
      [], // their audit rows
      [], // member anonymized
      [], // sign-ups deleted
      [{ id: "u1" }], // account row deleted
    );
    await removeUserData(chain(true) as never, "u1", { id: "admin" });

    expect(op("delete", "applications")).toHaveLength(1);
    expect(op("delete", "activity_log")).toHaveLength(1);
    const anonymize = op("update", "members");
    expect(anonymize).toHaveLength(1);
    const set = calls.find((c) => c.op === "set" && c.table === "members")!.arg as Record<
      string,
      unknown
    >;
    expect(set).toMatchObject({
      name: "Устгагдсан гишүүн",
      email: null,
      userId: null,
      photoUrl: null,
      showPublicly: false,
      active: false,
      anonymized: true,
    });
    // Hours and school year are never touched: the yearly totals stay the same.
    expect(set).not.toHaveProperty("volunteerHours");
    expect(set).not.toHaveProperty("schoolYear");
    expect(op("delete", "event_signups")).toHaveLength(1);
    expect(op("delete", "users")).toHaveLength(1);
    expect(logged).toEqual(["application.delete", "user.delete"]);
  });

  test("running twice (admin delete, then the webhook) is harmless", async () => {
    queued.push([], [], [], []);
    await removeUserData(chain(true) as never, "u1", null);
    expect(op("delete", "applications")).toHaveLength(0);
    expect(logged).toEqual([]);
  });

  test("the anonymized shape keeps no personal field", () => {
    expect(Object.keys(ANONYMIZED_MEMBER).sort()).toEqual(
      [
        "active",
        "anonymized",
        "className",
        "email",
        "name",
        "nameEn",
        "photoUrl",
        "role",
        "roleEn",
        "showPhoto",
        "showPublicly",
        "team",
        "userId",
      ].sort(),
    );
  });
});

describe("retention of rejected applications", () => {
  const now = Date.UTC(2027, 0, 1);

  test("cutoff = N days before now (bad values fall back to the default)", () => {
    expect(retentionCutoff(90, now).getTime()).toBe(now - 90 * 86_400_000);
    expect(retentionCutoff(0, now).getTime()).toBe(
      now - DEFAULT_REJECTED_RETENTION_DAYS * 86_400_000,
    );
    expect(retentionCutoff(Number.NaN, now).getTime()).toBe(
      now - DEFAULT_REJECTED_RETENTION_DAYS * 86_400_000,
    );
  });

  test("deletes only rejected applications of periods closed before the cutoff", async () => {
    queued.push(
      [{ value: { rejectedRetentionDays: 30 } }], // setting
      [{ id: "r1" }, { id: "r2" }], // expired
    );
    expect(await purgeExpiredRejected(chain(true) as never, now)).toBe(2);
    const where = calls.filter((c) => c.op === "where").map((c) => toSql(c.arg));
    const select = where[1]!;
    expect(select.sql).toContain('"applications"."status" = ?');
    expect(select.sql).toContain('"recruitment_periods"."closes_at" < ?');
    expect(select.params).toContain("rejected");
    expect(select.params).toContain(now - 30 * 86_400_000);
    expect(op("delete", "applications")).toHaveLength(1);
    expect(op("delete", "activity_log")).toHaveLength(1);
    expect(op("insert", "activity_log")).toHaveLength(1);
  });

  test("nothing expired → nothing deleted, no audit row", async () => {
    queued.push([], []);
    expect(await purgeExpiredRejected(chain(true) as never, now)).toBe(0);
    expect(calls.filter((c) => c.op === "delete" || c.op === "insert")).toEqual([]);
  });
});
