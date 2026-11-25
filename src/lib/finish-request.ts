/**
 * Keeps an app response alive until it is complete, even when the visitor leaves (closed tab,
 * cancelled prefetch, a script that drops the connection).
 *
 * Workers cancel a request when its client goes away, and Next.js shares some work between the
 * requests of an isolate (the first load of a module, a render that several visitors wait for).
 * If the request that started that work is cancelled, the work can never finish, and every
 * request waiting for it fails with an empty 500 ("This promise was created by a request that
 * has since ended"). Registering the work with `waitUntil` lets it finish; reading a copy of the
 * body to the end lets the render finish too. A completed response costs nothing extra.
 */
export function finishEvenIfCancelled(
  ctx: Pick<ExecutionContext, "waitUntil">,
  pending: Promise<Response>,
): Promise<Response> {
  ctx.waitUntil(pending.then(drop, drop));
  return pending.then((response) => {
    if (!response.body) return response;
    const [toClient, toFinish] = response.body.tee();
    ctx.waitUntil(drain(toFinish));
    return new Response(toClient, response);
  });
}

function drop() {
  return undefined;
}

async function drain(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  try {
    while (!(await reader.read()).done) {
      // read to the end
    }
  } catch {
    // the render itself failed: the client already got (or will get) the error
  }
}
