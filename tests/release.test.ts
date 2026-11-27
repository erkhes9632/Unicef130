/** `bun run release`: parsing wrangler output and the order of the steps. */
import { describe, expect, test } from "bun:test";
import { parseLiveVersion, parseUploadedVersion, releaseSteps } from "../scripts/lib/release-plan";

const LIVE = "1e8906a3-7141-42d1-870c-14f67b8deeb0";
const NEXT = "45158f74-f703-461a-baa2-6f6d565e6dd8";

describe("release", () => {
  test("reads the uploaded version id", () => {
    expect(
      parseUploadedVersion(`Uploaded unicef-club-130 (28.52 sec)\nWorker Version ID: ${NEXT}\n`),
    ).toBe(NEXT);
    expect(parseUploadedVersion("✘ [ERROR] upload failed")).toBeNull();
  });
  test("reads the live version only when exactly one version has 100 %", () => {
    expect(
      parseLiveVersion(JSON.stringify({ versions: [{ version_id: LIVE, percentage: 100 }] })),
    ).toBe(LIVE);
    expect(
      parseLiveVersion(
        JSON.stringify({
          versions: [
            { version_id: LIVE, percentage: 90 },
            { version_id: NEXT, percentage: 10 },
          ],
        }),
      ),
    ).toBeNull();
    expect(parseLiveVersion("not json")).toBeNull();
  });
  test("the new version is pinned at 0 % first; abort and rollback return the live one", () => {
    const s = releaseSteps(LIVE, NEXT);
    expect(s.pin).toContain(`${LIVE}@100%`);
    expect(s.pin).toContain(`${NEXT}@0%`);
    expect(s.warm).toEqual(["bun", "scripts/warm-cache.ts", "--version", NEXT]);
    expect(s.check).toEqual(["bun", "scripts/smoke.ts", "--version", NEXT]);
    expect(s.unpin).toContain(`${LIVE}@100%`);
    expect(s.unpin.join(" ")).not.toContain(`${NEXT}@`);
    expect(s.promote).toContain(`${NEXT}@100%`);
    expect(s.rollback).toBe(`bunx wrangler versions deploy ${LIVE}@100% --yes`);
  });
});
