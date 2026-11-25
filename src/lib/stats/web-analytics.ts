import "server-only";
import { logger } from "@/lib/logger";
import { bucketKey, bucketKeys, type Period } from "./period";
import type { Count, TrafficStats } from "./types";

/**
 * Website traffic from Cloudflare Web Analytics (cookie-free, no IPs stored) through the GraphQL
 * Analytics API. Server work is one small request per 10 minutes and period (Cache API); the
 * browser does the chart maths. Missing secrets or an API error → null (the page says the
 * visitor numbers are not connected; everything else keeps working).
 * Secrets: CF_ANALYTICS_API_TOKEN (Account Analytics: Read), CF_ACCOUNT_ID, CF_WEB_ANALYTICS_SITE_TAG.
 */
const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const CACHE_SECONDS = 600;

type Env = {
  SITE_URL?: string;
  CF_ANALYTICS_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_WEB_ANALYTICS_SITE_TAG?: string;
};
type Group = {
  count?: number;
  sum?: { visits?: number };
  dimensions?: Record<string, string>;
  quantiles?: Record<string, number>;
};

const filter = (siteTag: string, from: number, to: number) =>
  `{ siteTag: ${JSON.stringify(siteTag)}, datetime_geq: ${JSON.stringify(new Date(from).toISOString())}, datetime_lt: ${JSON.stringify(new Date(to).toISOString())} }`;

function trafficQuery(account: string, siteTag: string, p: Period) {
  const cur = filter(siteTag, p.from, p.to);
  const prev = filter(siteTag, p.prevFrom, p.prevTo);
  // Hours up to 90 days (UB day buckets are built from them); whole days for the school year.
  const time = p.key === "year" ? "date" : "datetimeHour";
  const top = (alias: string, dim: string, limit: number) =>
    `${alias}: rumPageloadEventsAdaptiveGroups(filter: ${cur}, limit: ${limit}, orderBy: [count_DESC]) { count dimensions { v: ${dim} } }`;
  return `{ viewer { accounts(filter: { accountTag: ${JSON.stringify(account)} }) {
    series: rumPageloadEventsAdaptiveGroups(filter: ${cur}, limit: 10000) { count sum { visits } dimensions { t: ${time} } }
    total: rumPageloadEventsAdaptiveGroups(filter: ${cur}, limit: 1) { count sum { visits } }
    prev: rumPageloadEventsAdaptiveGroups(filter: ${prev}, limit: 1) { count sum { visits } }
    ${top("pages", "requestPath", 10)}
    ${top("referrers", "refererHost", 8)}
    ${top("countries", "countryName", 8)}
    ${top("devices", "deviceType", 5)}
    ${top("browsers", "userAgentBrowser", 6)}
    ${top("os", "userAgentOS", 6)}
  } } }`;
}

const vitalsQuery = (account: string, dataset: string, siteTag: string, p: Period) =>
  `{ viewer { accounts(filter: { accountTag: ${JSON.stringify(account)} }) {
    v: ${dataset}(filter: ${filter(siteTag, p.from, p.to)}, limit: 1) { quantiles { largestContentfulPaintP75 interactionToNextPaintP75 cumulativeLayoutShiftP75 } }
  } } }`;

async function graphql(token: string, query: string) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = (await res.json()) as {
    data?: { viewer?: { accounts?: Record<string, Group[]>[] } };
    errors?: { message: string }[] | null;
  };
  if (!res.ok || json.errors?.length)
    throw new Error(json.errors?.[0]?.message ?? `HTTP ${res.status}`);
  return json.data?.viewer?.accounts?.[0] ?? {};
}

const counts = (groups: Group[] | undefined): Count[] =>
  (groups ?? [])
    .filter((g) => g.dimensions?.v)
    .map((g) => ({ label: g.dimensions!.v!, value: g.count ?? 0 }));

/** UTC hour "2026-11-21T06:00:00Z" or UTC date "2026-11-21" → UB bucket key. */
function toBucket(t: string, bucket: "hour" | "day") {
  const ms = Date.parse(t.length === 10 ? `${t}T00:00:00Z` : t);
  return t.length === 10 ? t : bucketKey(ms, bucket);
}

type Secrets = Required<Omit<Env, "SITE_URL">>;

async function fetchTraffic(env: Secrets, p: Period): Promise<TrafficStats> {
  const a = await graphql(
    env.CF_ANALYTICS_API_TOKEN,
    trafficQuery(env.CF_ACCOUNT_ID, env.CF_WEB_ANALYTICS_SITE_TAG, p),
  );
  const buckets = new Map(
    bucketKeys(p.from, p.to, p.bucket).map((k) => [k, { visits: 0, views: 0 }]),
  );
  for (const g of a.series ?? []) {
    const b = buckets.get(toBucket(g.dimensions?.t ?? "", p.bucket));
    if (!b) continue;
    b.visits += g.sum?.visits ?? 0;
    b.views += g.count ?? 0;
  }
  let vitals: TrafficStats["vitals"] = null;
  // Web Vitals live in their own dataset; the name differs between accounts/API versions.
  for (const dataset of [
    "rumWebVitalsEventsAdaptiveGroups",
    "rumPerformanceEventsAdaptiveGroups",
  ]) {
    try {
      const v = (
        await graphql(
          env.CF_ANALYTICS_API_TOKEN,
          vitalsQuery(env.CF_ACCOUNT_ID, dataset, env.CF_WEB_ANALYTICS_SITE_TAG, p),
        )
      ).v?.[0]?.quantiles;
      if (v?.largestContentfulPaintP75 != null) {
        vitals = {
          lcp: v.largestContentfulPaintP75 / 1000,
          inp: (v.interactionToNextPaintP75 ?? 0) / 1000,
          cls: v.cumulativeLayoutShiftP75 ?? 0,
        };
        break;
      }
    } catch {
      // try the next dataset; no vitals is fine
    }
  }
  const tot = (g?: Group[]) => ({ visits: g?.[0]?.sum?.visits ?? 0, views: g?.[0]?.count ?? 0 });
  return {
    series: [...buckets].map(([key, v]) => ({ key, ...v })),
    totals: tot(a.total),
    prevTotals: tot(a.prev),
    pages: counts(a.pages).map((c) => ({ path: c.label, views: c.value })),
    referrers: counts(a.referrers),
    countries: counts(a.countries),
    devices: counts(a.devices),
    browsers: counts(a.browsers),
    os: counts(a.os),
    vitals,
  };
}

export async function trafficStats(env: Env, p: Period): Promise<TrafficStats | null> {
  const {
    CF_ANALYTICS_API_TOKEN: token,
    CF_ACCOUNT_ID: account,
    CF_WEB_ANALYTICS_SITE_TAG: site,
  } = env;
  if (!token || !account || !site) return null;
  const cache = (caches as unknown as { default: Cache }).default;
  // One cache entry per period and 10-minute window (the API itself lags a few minutes).
  // (A key on the site's own host: the Cache API is per zone.)
  const origin = (env.SITE_URL ?? "http://localhost:8787").replace(/\/+$/, "");
  const key = new Request(
    `${origin}/__cache/traffic/${p.key}/${Math.floor(p.to / (CACHE_SECONDS * 1000))}`,
  );
  try {
    const hit = await cache.match(key);
    if (hit) return (await hit.json()) as TrafficStats;
    const data = await fetchTraffic(
      { CF_ANALYTICS_API_TOKEN: token, CF_ACCOUNT_ID: account, CF_WEB_ANALYTICS_SITE_TAG: site },
      p,
    );
    await cache.put(
      key,
      new Response(JSON.stringify(data), {
        headers: { "cache-control": `max-age=${CACHE_SECONDS}` },
      }),
    );
    return data;
  } catch (err) {
    logger.error("stats", "web analytics unavailable", err);
    return null;
  }
}
