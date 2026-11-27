/**
 * Pure parts of `bun run release` (unit-tested in tests/release.test.ts).
 */

/** The version id printed by `wrangler versions upload` / `opennextjs-cloudflare upload`. */
export function parseUploadedVersion(output: string): string | null {
  return /Worker Version ID:\s*([0-9a-f-]{36})/i.exec(output)?.[1] ?? null;
}

/** The version serving 100 % of the traffic, from `wrangler deployments status --json`. */
export function parseLiveVersion(json: string): string | null {
  try {
    const status = JSON.parse(json) as {
      versions?: { version_id?: string; percentage?: number }[];
    };
    const live = status.versions?.filter((v) => v.percentage === 100) ?? [];
    return live.length === 1 ? (live[0]!.version_id ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * The release, step by step. Visitors stay on `live` until the new version has warmed every
 * public page and passed the smoke test while pinned (0 %, reached only with the
 * version-override header); only then does it get 100 %.
 */
export function releaseSteps(live: string, next: string) {
  const deploy = (spec: string, message: string) => [
    "bunx",
    "wrangler",
    "versions",
    "deploy",
    ...spec.split(" "),
    "--message",
    message,
    "--yes",
  ];
  return {
    pin: deploy(`${live}@100% ${next}@0%`, `release ${next.slice(0, 8)}: pre-warm at 0%`),
    warm: ["bun", "scripts/warm-cache.ts", "--version", next],
    check: ["bun", "scripts/smoke.ts", "--version", next],
    unpin: deploy(
      `${live}@100%`,
      `release ${next.slice(0, 8)}: aborted, back to ${live.slice(0, 8)}`,
    ),
    promote: deploy(`${next}@100%`, `release ${next.slice(0, 8)}: live`),
    smokeLive: ["bun", "scripts/smoke.ts"],
    rollback: `bunx wrangler versions deploy ${live}@100% --yes`,
  };
}
