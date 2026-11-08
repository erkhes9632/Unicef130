import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

/**
 * Drizzle client bound to the D1 binding of the current request.
 * Works in `next dev` (via initOpenNextCloudflareForDev → local Miniflare D1) and on Workers.
 */
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return createDb(env.DB);
}

export { schema };
