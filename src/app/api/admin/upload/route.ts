// Uploads for cover images, post images and avatars. Multipart in, a public URL out, which is all the
// content rows ever store.

import { requireAdmin } from "@/lib/auth";
import { bad, ok } from "@/lib/admin-crud";
import { deleteBlob, isKind, KINDS, refused, uploadBlob } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Expected multipart form data with a file field", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return bad("file is required", 400);
  const kind = form.get("kind");
  if (!isKind(kind)) return bad(`kind must be one of ${Object.keys(KINDS).join(", ")}`, 400);

  const result = await uploadBlob(kind, file);
  if (refused(result)) return bad(result.error, result.status);
  return ok(result, 201);
}

export async function DELETE(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(request.url).searchParams.get("url");
  if (!url) return bad("A url is required", 400);
  const result = await deleteBlob(url);
  if (refused(result)) return bad(result.error, result.status);
  return ok(result);
}
