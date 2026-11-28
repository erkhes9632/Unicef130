/**
 * The pre-paint script and the header's cookie parser agree on who counts as a signed-in member
 * (so «Гишүүн болох» never flashes for members, and never disappears for visitors).
 */
import { describe, expect, test } from "bun:test";
import { MEMBER_HINT_SCRIPT, readHeaderSession } from "@/lib/auth/role-hint";

function runScript(cookie: string): boolean {
  const attrs = new Set<string>();
  const document = {
    cookie,
    documentElement: { setAttribute: (name: string) => void attrs.add(name) },
  };
  new Function("document", MEMBER_HINT_SCRIPT)(document);
  return attrs.has("data-member-hint");
}

describe("member hint before paint", () => {
  const cases = [
    "",
    "club_role=member",
    "__client_uat=0; club_role=member",
    "__client_uat=1795790000; club_role=member",
    "__client_uat_Ab-1=1795790000; club_role=admin",
    "__client_uat=1795790000; club_role=applicant",
    "__client_uat=1795790000",
    "x=1; __client_uat=1795790000; theme=dark; club_role=member; y=2",
    "__client_uat=1795790000; club_role=memberx",
  ];
  for (const cookie of cases)
    test(JSON.stringify(cookie), () => {
      const { signedIn, role } = readHeaderSession(cookie);
      const member = signedIn && (role === "member" || role === "admin");
      expect(runScript(cookie)).toBe(member);
    });
});
