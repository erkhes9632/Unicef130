import { readFileSync } from "node:fs";

/**
 * Shared by `cache:warm`, `smoke` and `release`: the list of public addresses to check and a GET that keeps
 * what is needed to debug a failure (status, Cloudflare ray id, the start of the body).
 */

/** Every public section, both languages, plus the cached account entry points. */
const SECTIONS = [
  "",
  "/about",
  "/impact",
  "/news",
  "/events",
  "/gallery",
  "/members",
  "/faq",
  "/support",
  "/privacy",
  "/join",
  "/sign-in",
];

export type Result = {
  path: string;
  status: number;
  ray: string;
  body: string;
  error?: string;
};
export type Failure = Result;

/**
 * Sections in mn and en, plus every address in the sitemap (news, events, albums, impact years —
 * the detail pages). If the sitemap itself fails, the sections are still checked.
 */
export async function publicPaths(
  base: string,
  headers: Record<string, string> = {},
): Promise<string[]> {
  const sections = SECTIONS.flatMap((p) => [p || "/", `/en${p}`]);
  let fromSitemap: string[] = [];
  try {
    const response = await fetch(`${base}/sitemap.xml`, { headers });
    if (response.ok)
      fromSitemap = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => new URL(m[1]!).pathname,
      );
    else console.error(`sitemap.xml answered ${response.status}: checking the sections only`);
  } catch (err) {
    console.error(`sitemap.xml failed (${String(err)}): checking the sections only`);
  }
  return [...new Set([...sections, ...fromSitemap])];
}

/** Worker name and SITE_URL from wrangler.jsonc. */
export function siteConfig() {
  const config = readFileSync("wrangler.jsonc", "utf8");
  return {
    worker: /"name":\s*"([^"]+)"/.exec(config)?.[1] ?? "",
    siteUrl: /"SITE_URL":\s*"([^"]+)"/.exec(config)?.[1] ?? "",
  };
}

/**
 * Headers that send a request to one uploaded version instead of the live one (Workers gradual
 * deployments: the version must be in the current deployment, e.g. at 0 %).
 */
export function versionHeaders(version: string | undefined): Record<string, string> {
  if (!version) return {};
  return { "cloudflare-workers-version-overrides": `${siteConfig().worker}="${version}"` };
}

/** GET one address, read to the end (no early cancel), no redirects followed. */
export async function visit(
  base: string,
  path: string,
  headers: Record<string, string> = {},
): Promise<Result> {
  try {
    const response = await fetch(`${base}${path}`, {
      redirect: "manual",
      headers: { "user-agent": "unicef-club-130 site check", ...headers },
    });
    const text = await response.text();
    return {
      path,
      status: response.status,
      ray: response.headers.get("cf-ray") ?? "-",
      body: response.status >= 500 ? text : "",
    };
  } catch (err) {
    return { path, status: 0, ray: "-", body: "", error: String(err) };
  }
}

/** The body as readable text: the page title (Cloudflare error pages) and the start of the text. */
function bodyExcerpt(body: string) {
  if (!body.trim()) return "(empty body — the app's own 500, see `wrangler tail`)";
  const title = /<title>([^<]*)<\/title>/i.exec(body)?.[1]?.trim();
  const code = /Error code:?\s*(\d{3,4})/i.exec(body)?.[1];
  const text = body
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
  return [title && `title: ${title}`, code && `Cloudflare error ${code}`, text]
    .filter(Boolean)
    .join("\n");
}

/** A loud report for a failed post-deploy check, with the rollback command. */
export function describeFailure(
  check: string,
  base: string,
  failed: Failure[],
  nextSteps = [
    "The new version is LIVE. Roll back now:",
    "  bunx wrangler rollback",
    "Then read the errors (filter on the failing addresses):",
    "  bunx wrangler tail --format json --status error",
  ],
) {
  const first = failed[0]!;
  return [
    "",
    "=".repeat(72),
    `✘ ${check} FAILED on ${base}: ${failed.length} address(es) answered 5xx or did not answer.`,
    "=".repeat(72),
    ...failed.map(
      (f) => `  ${f.status || "ERR"} ${f.path}${f.ray !== "-" ? `  (ray ${f.ray})` : ""}`,
    ),
    "",
    `First failure: ${first.status || "ERR"} ${base}${first.path}`,
    first.error ? `  network error: ${first.error}` : bodyExcerpt(first.body),
    "",
    ...nextSteps,
    "=".repeat(72),
  ].join("\n");
}
