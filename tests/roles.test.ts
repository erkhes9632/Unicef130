/**
 * Pure rules of the Clerk migration: route access (middleware), roles, account-action guards
 * (self / last admin), user filters, Clerk key helpers, the D1 mirror and the admin script.
 */
import { describe, expect, test } from "bun:test";
import { frontendApiFromPublishableKey, signInPathFor } from "@/lib/auth/clerk";
import { decideAccess, homePathFor, routeArea, toRole } from "@/lib/auth/roles";
import { filterUsers, parseUserFilters } from "@/lib/users/list";
import { checkUserAction, roleAfter } from "@/lib/users/rules";
import { mirrorFromClerk } from "@/lib/users/sync";
import { planRoleChange, instanceOf, type ClerkUserLite } from "../scripts/lib/admin-role";

describe("route access (middleware)", () => {
  test("areas", () => {
    expect(routeArea("/admin")).toBe("admin");
    expect(routeArea("/admin/users")).toBe("admin");
    expect(routeArea("/administrator")).toBe("public");
    expect(routeArea("/me")).toBe("member");
    expect(routeArea("/en/me/x")).toBe("member");
    expect(routeArea("/members")).toBe("public");
    expect(routeArea("/join")).toBe("public");
  });

  test("not signed in → sign-in for /admin and /me; public pages stay open", () => {
    expect(decideAccess("admin", { signedIn: false, role: null })).toEqual({
      allow: false,
      redirect: "sign-in",
    });
    expect(decideAccess("member", { signedIn: false, role: null })).toEqual({
      allow: false,
      redirect: "sign-in",
    });
    expect(decideAccess("public", { signedIn: false, role: null })).toEqual({ allow: true });
  });

  test("/admin is admin-only; others go home", () => {
    expect(decideAccess("admin", { signedIn: true, role: "admin" })).toEqual({ allow: true });
    expect(decideAccess("admin", { signedIn: true, role: "member" })).toEqual({
      allow: false,
      redirect: "/",
    });
    expect(decideAccess("admin", { signedIn: true, role: null })).toEqual({
      allow: false,
      redirect: "/",
    });
  });

  test("/me is for members and admins; applicants go to /join", () => {
    expect(decideAccess("member", { signedIn: true, role: "member" })).toEqual({ allow: true });
    expect(decideAccess("member", { signedIn: true, role: "admin" })).toEqual({ allow: true });
    expect(decideAccess("member", { signedIn: true, role: null })).toEqual({
      allow: false,
      redirect: "/join",
    });
  });

  test("role values and landing pages", () => {
    expect(toRole("admin")).toBe("admin");
    expect(toRole("member")).toBe("member");
    for (const bad of ["editor", "reviewer", "", null, undefined, 1, { role: "admin" }])
      expect(toRole(bad)).toBeNull();
    expect(homePathFor("admin")).toBe("/admin");
    expect(homePathFor("member")).toBe("/me");
    expect(homePathFor(null)).toBe("/join");
    expect(homePathFor("member", "en")).toBe("/en/me");
    expect(homePathFor("admin", "en")).toBe("/admin");
  });
});

describe("account action guards", () => {
  const admin = { id: "a1", role: "admin" as const, banned: false };
  const member = { id: "m1", role: "member" as const, banned: false };
  const applicant = { id: "u1", role: null, banned: false };

  test("an admin can't ban, delete or demote themselves", () => {
    for (const action of ["make-member", "remove-role", "ban", "delete"] as const)
      expect(checkUserAction({ actorId: "a1", target: admin, action, adminCount: 3 })).toBe("self");
  });

  test("the last admin can't be demoted, banned or deleted", () => {
    for (const action of ["make-member", "remove-role", "ban", "delete"] as const)
      expect(checkUserAction({ actorId: "a2", target: admin, action, adminCount: 1 })).toBe(
        "last-admin",
      );
    expect(
      checkUserAction({ actorId: "a2", target: admin, action: "remove-role", adminCount: 2 }),
    ).toBeNull();
  });

  test("admins can't delete their own account; members and applicants can", () => {
    expect(
      checkUserAction({ actorId: "a1", target: admin, action: "self-delete", adminCount: 5 }),
    ).toBe("admin-self-delete");
    expect(
      checkUserAction({ actorId: "m1", target: member, action: "self-delete", adminCount: 1 }),
    ).toBeNull();
    expect(
      checkUserAction({ actorId: "u1", target: applicant, action: "self-delete", adminCount: 1 }),
    ).toBeNull();
    expect(
      checkUserAction({ actorId: "x", target: member, action: "self-delete", adminCount: 1 }),
    ).toBe("self");
  });

  test("no-op changes are refused; normal changes pass", () => {
    expect(
      checkUserAction({ actorId: "a1", target: member, action: "make-member", adminCount: 1 }),
    ).toBe("no-change");
    expect(
      checkUserAction({ actorId: "a1", target: applicant, action: "remove-role", adminCount: 1 }),
    ).toBe("no-change");
    expect(
      checkUserAction({
        actorId: "a1",
        target: { ...member, banned: true },
        action: "ban",
        adminCount: 1,
      }),
    ).toBe("no-change");
    expect(checkUserAction({ actorId: "a1", target: member, action: "unban", adminCount: 1 })).toBe(
      "no-change",
    );
    expect(
      checkUserAction({ actorId: "a1", target: applicant, action: "make-member", adminCount: 1 }),
    ).toBeNull();
    expect(
      checkUserAction({ actorId: "a1", target: member, action: "ban", adminCount: 1 }),
    ).toBeNull();
  });

  test("role after an action", () => {
    expect(roleAfter("make-admin", null)).toBe("admin");
    expect(roleAfter("make-member", "admin")).toBe("member");
    expect(roleAfter("remove-role", "member")).toBeNull();
    expect(roleAfter("ban", "member")).toBe("member");
  });
});

describe("users list filters", () => {
  const rows = [
    { name: "Батын Анужин", email: "anujin@gmail.com", role: "member" as const, banned: false },
    { name: "Clerk Admin", email: "boss@school.mn", role: "admin" as const, banned: false },
    { name: "", email: "new@gmail.com", role: null, banned: false },
    { name: "Bad Actor", email: "x@y.mn", role: null, banned: true },
  ];
  test("role filters", () => {
    expect(filterUsers(rows, { q: "", role: "admin" }).map((r) => r.email)).toEqual([
      "boss@school.mn",
    ]);
    expect(filterUsers(rows, { q: "", role: "applicant" })).toHaveLength(2);
    expect(filterUsers(rows, { q: "", role: "banned" }).map((r) => r.email)).toEqual(["x@y.mn"]);
  });
  test("search by Cyrillic name (case-insensitive) or e-mail", () => {
    expect(filterUsers(rows, { q: "анужин", role: "" })).toHaveLength(1);
    expect(filterUsers(rows, { q: "GMAIL", role: "" })).toHaveLength(2);
  });
  test("unknown filter values are ignored, search is trimmed and capped", () => {
    expect(parseUserFilters({ role: "editor", q: "  анужин " })).toEqual({ role: "", q: "анужин" });
    expect(parseUserFilters({ q: "x".repeat(200) }).q).toHaveLength(80);
  });
});

describe("Clerk helpers", () => {
  test("frontend API host from the publishable key", () => {
    const key = `pk_test_${btoa("wanted-foal-9793.clerk.accounts.dev$")}`;
    expect(frontendApiFromPublishableKey(key)).toBe("https://wanted-foal-9793.clerk.accounts.dev");
    expect(frontendApiFromPublishableKey(`pk_live_${btoa("clerk.example.mn$")}`)).toBe(
      "https://clerk.example.mn",
    );
    expect(frontendApiFromPublishableKey("")).toBeNull();
    expect(frontendApiFromPublishableKey("sk_test_abc")).toBeNull();
    expect(
      frontendApiFromPublishableKey(`pk_test_${btoa('evil.com/x"; script-src *$')}`),
    ).toBeNull();
  });
  test("sign-in path follows the page language", () => {
    expect(signInPathFor("/admin/users")).toBe("/sign-in");
    expect(signInPathFor("/en/me")).toBe("/en/sign-in");
    expect(signInPathFor("/english")).toBe("/sign-in");
  });
});

describe("D1 mirror of a Clerk user", () => {
  test("Backend API shape (camelCase)", () => {
    const m = mirrorFromClerk({
      id: "user_1",
      emailAddresses: [
        { id: "e1", emailAddress: "Other@x.mn" },
        { id: "e2", emailAddress: "Main@Gmail.com" },
      ],
      primaryEmailAddressId: "e2",
      firstName: "Анужин",
      lastName: "Бат",
      publicMetadata: { role: "member" },
      banned: false,
      twoFactorEnabled: true,
      lastSignInAt: 1_700_000_000_000,
      createdAt: 1_600_000_000_000,
    });
    expect(m).toMatchObject({
      id: "user_1",
      email: "main@gmail.com",
      name: "Анужин Бат",
      role: "member",
      banned: false,
      twoFactorEnabled: true,
    });
    expect(m!.createdAt.getTime()).toBe(1_600_000_000_000);
  });
  test("webhook shape (snake_case), unknown role → applicant", () => {
    const m = mirrorFromClerk({
      id: "user_2",
      email_addresses: [{ id: "e1", email_address: "kid@gmail.com" }],
      primary_email_address_id: "e1",
      first_name: null,
      last_name: null,
      public_metadata: { role: "superuser" },
      banned: true,
      created_at: 1,
    });
    expect(m).toMatchObject({ email: "kid@gmail.com", name: "", role: null, banned: true });
  });
  test("garbage is ignored", () => {
    expect(mirrorFromClerk(null)).toBeNull();
    expect(mirrorFromClerk({ id: "" })).toBeNull();
  });
});

describe("admin:grant / admin:revoke script", () => {
  const user = (id: string, role: string | null, banned = false): ClerkUserLite => ({
    id,
    banned,
    publicMetadata: role ? { role } : {},
    emailAddresses: [{ emailAddress: `${id}@x.mn` }],
  });
  test("secret key instance", () => {
    expect(instanceOf("sk_test_abc123")).toBe("development");
    expect(instanceOf("sk_live_abc123")).toBe("production");
    expect(instanceOf("pk_live_abc")).toBeNull();
  });
  test("grant: sets admin, also lifts a ban (break-glass)", () => {
    expect(planRoleChange("grant", user("a", null), [])).toEqual({ action: "set-admin" });
    expect(planRoleChange("grant", user("a", "admin", true), [])).toEqual({
      action: "unban-and-set-admin",
    });
    expect(planRoleChange("grant", user("a", "admin"), [])).toEqual({ refuse: "already an admin" });
  });
  test("revoke never removes the last active admin", () => {
    const a = user("a", "admin");
    expect(planRoleChange("revoke", a, [a, user("b", "admin", true)])).toHaveProperty("refuse");
    expect(planRoleChange("revoke", a, [a, user("b", "admin")])).toEqual({
      action: "remove-admin",
    });
    expect(planRoleChange("revoke", user("m", "member"), [])).toEqual({ refuse: "not an admin" });
  });
});
