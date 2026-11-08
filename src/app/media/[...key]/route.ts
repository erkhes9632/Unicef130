import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Serves uploaded images from R2. Keys are unique (UUID), so responses are cached forever. */
export async function GET(request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!/^[a-z]+\/[\w/.-]+$/.test(key) || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.MEDIA.get(key, { onlyIf: request.headers });
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  // `onlyIf` matched → conditional request satisfied, no body.
  if (!("body" in object) || !object.body) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}
