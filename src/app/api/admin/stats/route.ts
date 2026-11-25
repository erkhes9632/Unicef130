import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { AuthError, assertAdmin } from "@/lib/auth/session";
import { clubStats } from "@/lib/stats/club";
import { statsCsv } from "@/lib/stats/csv";
import { parsePeriod, periodRange } from "@/lib/stats/period";
import { siteStatus } from "@/lib/stats/status";
import type { StatsResponse } from "@/lib/stats/types";
import { trafficStats } from "@/lib/stats/web-analytics";

/**
 * Statistics for /admin/stats: small aggregated JSON (or CSV with ?format=csv). Admins only —
 * anyone else gets 404. Cheap on purpose (Free plan): one D1 batch, a 10-minute cached Web
 * Analytics request; the browser draws the charts.
 */
export async function GET(request: NextRequest) {
  try {
    await assertAdmin();
  } catch (err) {
    if (err instanceof AuthError) return new Response("Not found", { status: 404 });
    throw err;
  }
  const { env } = await getCloudflareContext({ async: true });
  const now = Date.now();
  const period = periodRange(parsePeriod(request.nextUrl.searchParams.get("period")), now);
  const [club, traffic, status] = await Promise.all([
    clubStats(env.DB, period),
    trafficStats(env, period),
    siteStatus(env.DB, env, now),
  ]);
  const body: StatsResponse = { period, status, traffic, club };
  if (request.nextUrl.searchParams.get("format") === "csv")
    return new Response(statsCsv(body), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="statistik-${period.key}.csv"`,
        "cache-control": "no-store",
      },
    });
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}
