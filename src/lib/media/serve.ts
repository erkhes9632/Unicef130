/**
 * Serves an uploaded image from R2 (binding MEDIA). Keys are unique (UUID / versioned report
 * paths), so responses are immutable. Used by worker.ts before the app (no Next.js work per
 * image) and by app/media/[...key] (next dev).
 */
export const MEDIA_KEY = /^[a-z]+\/[\w/.-]+$/;

export async function serveMedia(bucket: R2Bucket, key: string, request: Request) {
  if (!MEDIA_KEY.test(key) || key.includes("..")) return new Response("Not found", { status: 404 });
  const object = await bucket.get(key, { onlyIf: request.headers });
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
