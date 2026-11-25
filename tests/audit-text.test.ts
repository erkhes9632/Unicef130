import { describe, expect, test } from "bun:test";
import { describeEntry, groupEntries, type AuditEntry } from "@/lib/admin/audit-text";

const at = (hhmm: string) => new Date(`2026-11-25T${hhmm}:00+08:00`);
const entry = (x: Partial<AuditEntry>): AuditEntry => ({
  id: Math.random().toString(36),
  action: "member.update",
  entityType: "member",
  entityId: null,
  summary: "",
  userId: "u_admin",
  createdAt: at("16:00"),
  ...x,
});
const names = {
  accounts: new Map([
    ["user_3MYabcdefgh", { name: "Solongo Orgil", role: "admin" }],
    ["user_kid1234567", { name: "Хүүхэд Нэр", role: null }],
  ]),
  members: new Map([["m2526-lead-1", "Батын Анужин"]]),
};

describe("audit log in plain words", () => {
  test("role change of an admin/member account shows the name", () => {
    expect(
      describeEntry(
        entry({
          action: "user.role",
          entityType: "user",
          entityId: "user_3MYabcdefgh",
          summary: "Бүртгэл #user_3MY — эрх: Админ",
        }),
        names,
      ),
    ).toBe("Solongo Orgil-ийг админ болгов");
  });
  test("applicants stay numbers", () => {
    const e = entry({
      action: "user.role",
      entityType: "user",
      entityId: "user_kid1234567",
      summary: "Бүртгэл #user_kid — эрх: Гишүүн",
    });
    expect(describeEntry(e, names)).toBe("Бүртгэл #user_kid — эрх: Гишүүн");
  });
  test("member records get their name; unknown actions get plain words", () => {
    expect(
      describeEntry(
        entry({ entityId: "m2526-lead-1", summary: "Гишүүн #m2526-le — мэдээллийг засав" }),
        names,
      ),
    ).toBe("Батын Анужин — мэдээллийг засав");
    expect(
      describeEntry(entry({ action: "profile.two_factor_enable", entityType: "user" }), names),
    ).toBe("Хоёр шаттай баталгаажуулалт асаав");
  });
  test("runs of the same action are grouped with their time span", () => {
    const same = (t: string) => entry({ summary: "5 гишүүнийг нийтэд харуулав", createdAt: at(t) });
    const groups = groupEntries(
      [
        same("16:16"),
        same("16:14"),
        same("16:11"),
        entry({ summary: "Өөр", createdAt: at("16:10") }),
      ],
      names,
    );
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ count: 3, first: at("16:11"), last: at("16:16") });
    expect(groups[1]!.count).toBe(1);
  });
});
