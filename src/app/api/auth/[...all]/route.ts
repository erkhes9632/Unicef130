import { getAuth } from "@/lib/auth";

// Better Auth HTTP handler (sign-in, sign-out, session). Sign-up is disabled in the config.
async function handler(request: Request) {
  const auth = await getAuth();
  return auth.handler(request);
}

export { handler as GET, handler as POST };
