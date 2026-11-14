import { getCurrentUser } from "@/lib/auth/session";
import { MEDIA_KINDS, type MediaKind } from "@/lib/media/constants";
import { storeImage, UploadError } from "@/lib/media/server";

/**
 * Image upload for the admin panel (editor+). Accepts multipart/form-data:
 *   file: image (already resized/compressed in the browser), kind: news|events|members|gallery|site,
 *   variant?: full|thumb
 */
export async function POST(request: Request) {
  // CSRF: only same-origin requests (browsers always send Origin on POST).
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== new URL(request.url).host) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Буруу хүсэлт." }, { status: 400 });
  }
  const file = form.get("file");
  const kind = form.get("kind");
  const variant = form.get("variant") === "thumb" ? "thumb" : "full";
  if (!(file instanceof File)) return Response.json({ error: "Файл олдсонгүй." }, { status: 400 });
  if (typeof kind !== "string" || !MEDIA_KINDS.includes(kind as MediaKind)) {
    return Response.json({ error: "Буруу төрөл." }, { status: 400 });
  }

  try {
    const { url } = await storeImage(file, kind as MediaKind, variant);
    return Response.json({ url });
  } catch (err) {
    if (err instanceof UploadError) return Response.json({ error: err.message }, { status: 400 });
    console.error("[upload] failed", err);
    return Response.json({ error: "Хадгалах үед алдаа гарлаа." }, { status: 500 });
  }
}
