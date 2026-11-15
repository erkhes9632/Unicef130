"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { verifyTurnstile } from "@/lib/integrations/turnstile";
import { consumeRateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/recruitment/form-token";
import {
  givenName,
  normalizeTrackingCode,
  publicStatus,
  type PublicStatus,
} from "@/lib/recruitment/logic";

export type StatusLookupResult =
  | { ok: true; firstName: string; status: PublicStatus; submittedAt: string }
  | { ok: false; error: "notFound" | "rate" | "invalid" | "captcha" | "unavailable" };

/**
 * Applicant status lookup: tracking code + last 4 digits of the phone. Shows only the first name
 * and a public status. Wrong code and wrong digits give the same answer, and lookups need
 * Turnstile and are rate-limited per address, so codes cannot be guessed in bulk.
 */
export async function lookupApplicationStatus(input: {
  code: string;
  last4: string;
  turnstileToken: string;
}): Promise<StatusLookupResult> {
  const code = normalizeTrackingCode(String(input?.code ?? ""));
  const last4 = String(input?.last4 ?? "").replace(/\D/g, "");
  if (!code || last4.length !== 4) return { ok: false, error: "invalid" };

  const ip = (await headers()).get("cf-connecting-ip");
  const check = await verifyTurnstile(input?.turnstileToken, ip);
  if (check !== "ok")
    return { ok: false, error: check === "unavailable" ? "unavailable" : "captcha" };

  const ipHash = await hashIp(ip);
  if (!(await consumeRateLimit(`status:${ipHash}`, 8, 10 * 60 * 1000)).allowed)
    return { ok: false, error: "rate" };

  const db = await getDb();
  const [row] = await db
    .select({
      fullName: applications.fullName,
      status: applications.status,
      phone: applications.phoneNormalized,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .where(eq(applications.trackingCode, code))
    .limit(1);
  if (!row || !row.phone?.endsWith(last4)) return { ok: false, error: "notFound" };
  return {
    ok: true,
    firstName: givenName(row.fullName),
    status: publicStatus(row.status),
    submittedAt: row.createdAt.toISOString(),
  };
}
