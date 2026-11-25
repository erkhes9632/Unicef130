import "server-only";
import { revalidateTag } from "next/cache";

/**
 * Public pages (app/[locale]) are cached. After an admin edit they are marked stale with
 * stale-while-revalidate semantics ("max"): visitors keep getting the cached page while a
 * background job re-renders it, so no visitor waits for (or fails on) a full render on the
 * Free plan's 10 ms CPU budget. Every public page carries this implicit layout tag.
 */
export const PUBLIC_PAGES_TAG = "_N_T_/[locale]/layout";

export function revalidatePublic() {
  revalidateTag(PUBLIC_PAGES_TAG, "max");
}
