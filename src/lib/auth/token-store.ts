import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { authTokens, type AuthTokenKind } from "@/db/schema";
import { generateToken, hashToken, isWellFormedToken, TOKEN_TTL_MS, tokenState } from "./tokens";

/** Creates a one-time token and returns the raw value (shown once; only its hash is stored). */
export async function createAuthToken(input: {
  kind: AuthTokenKind;
  email: string;
  role?: string;
  userId?: string;
  createdBy: string;
}) {
  const db = await getDb();
  // A new link replaces any unused older link of the same kind for the same person.
  await db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.kind, input.kind),
        eq(authTokens.email, input.email),
        isNull(authTokens.usedAt),
      ),
    );
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.insert(authTokens).values({
    kind: input.kind,
    tokenHash: await hashToken(token),
    email: input.email,
    role: input.role ?? null,
    userId: input.userId ?? null,
    createdBy: input.createdBy,
    expiresAt,
  });
  return { token, expiresAt };
}

/** Looks a link up without using it (for rendering the "set password" page). */
export async function inspectAuthToken(kind: AuthTokenKind, token: unknown) {
  if (!isWellFormedToken(token)) return { state: "missing" as const, row: null };
  const db = await getDb();
  const [row] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.kind, kind), eq(authTokens.tokenHash, await hashToken(token))))
    .limit(1);
  return { state: tokenState(row), row: row ?? null };
}

/**
 * Marks the link as used. Atomic: of two concurrent requests with the same link only one gets
 * the row back, so a link can never be used twice.
 */
export async function consumeAuthToken(kind: AuthTokenKind, token: unknown) {
  if (!isWellFormedToken(token)) return null;
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(authTokens.kind, kind),
        eq(authTokens.tokenHash, await hashToken(token)),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, now),
      ),
    )
    .returning();
  return row ?? null;
}
