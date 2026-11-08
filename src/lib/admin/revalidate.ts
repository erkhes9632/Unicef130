import "server-only";
import { revalidatePath } from "next/cache";

/** Public pages are dynamic, but clear any cached RSC payloads after content changes. */
export function revalidatePublic() {
  revalidatePath("/", "layout");
}
