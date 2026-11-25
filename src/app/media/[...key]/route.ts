import { getCloudflareContext } from "@opennextjs/cloudflare";
import { serveMedia } from "@/lib/media/serve";

/** Uploaded images from R2. In production worker.ts answers /media/* before the app. */
export async function GET(request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const { env } = await getCloudflareContext({ async: true });
  return serveMedia(env.MEDIA, key.join("/"), request);
}
