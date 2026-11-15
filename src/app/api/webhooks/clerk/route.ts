import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { handleClerkEvent } from "@/lib/users/webhook";

/**
 * Clerk → D1 sync (Clerk dashboard → Webhooks: user.created, user.updated, user.deleted).
 * The Svix signature is verified with CLERK_WEBHOOK_SIGNING_SECRET; anything unsigned or
 * tampered with is rejected before it touches the database.
 */
export async function POST(request: NextRequest) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim();
  if (!signingSecret) return new Response("Webhook not configured", { status: 503 });

  let event;
  try {
    event = await verifyWebhook(request, { signingSecret });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  try {
    const result = await handleClerkEvent(await getDb(), event);
    return Response.json({ ok: true, result });
  } catch (err) {
    console.error("[clerk webhook] failed", event.type, err);
    // 5xx → Clerk retries later.
    return new Response("Failed", { status: 500 });
  }
}
