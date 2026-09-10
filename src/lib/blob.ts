// Vercel Blob, wrapped so the route above it stays a route. Three prefixes keep the store tidy, an
// allow-list keeps it to the file types the site actually renders, and every failure comes back as a
// value: an unconfigured store is a 501, not a thrown exception in a request.

import { del, put } from "@vercel/blob";

/** Where each kind of upload lives in the store. */
export const KINDS = {
  covers: "covers/",
  posts: "posts/",
  avatars: "avatars/",
} as const;
export type UploadKind = keyof typeof KINDS;
export const isKind = (v: unknown): v is UploadKind => typeof v === "string" && Object.hasOwn(KINDS, v);

export const MAX_BYTES = 6 * 1024 * 1024;

/** Only what the pages render: raster images, an SVG, or a PDF for the résumé. */
export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/svg+xml", "application/pdf"] as const;
const EXTENSIONS: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};
const isAllowed = (type: string): boolean => ALLOWED_TYPES.some((t) => t === type);

export const blobConfigured = (): boolean => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export interface Upload {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
}
export interface Refused {
  error: string;
  status: number;
}
export type BlobResult<T> = T | Refused;
export const refused = <T>(r: BlobResult<T>): r is Refused => typeof r === "object" && r !== null && "error" in r;

const NOT_CONFIGURED: Refused = { error: "The blob store is not configured: set BLOB_READ_WRITE_TOKEN", status: 501 };

/** A predictable, safe object name: the original stem, slugged, plus the extension its type implies. */
function pathFor(kind: UploadKind, name: string, type: string): string {
  const stem =
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";
  return `${KINDS[kind]}${stem}.${EXTENSIONS[type] ?? "bin"}`;
}

export async function uploadBlob(kind: UploadKind, file: File): Promise<BlobResult<Upload>> {
  // The file is judged before the store is: a rejected type is a 415 whether or not a token exists.
  const type = file.type || "application/octet-stream";
  if (!isAllowed(type)) return { error: `${type} is not an accepted file type`, status: 415 };
  if (file.size === 0) return { error: "That file is empty", status: 400 };
  if (file.size > MAX_BYTES) return { error: `That file is larger than ${Math.round(MAX_BYTES / 1024 / 1024)} MB`, status: 413 };
  if (!blobConfigured()) return NOT_CONFIGURED;

  try {
    const stored = await put(pathFor(kind, file.name, type), file, {
      access: "public",
      addRandomSuffix: true,
      contentType: type,
      cacheControlMaxAge: 31_536_000,
    });
    return { url: stored.url, pathname: stored.pathname, size: file.size, contentType: stored.contentType || type };
  } catch (e) {
    console.error("[admin] blob put", e instanceof Error ? e.message : e);
    return { error: "The upload failed", status: 502 };
  }
}

export async function deleteBlob(url: string): Promise<BlobResult<{ success: true }>> {
  if (!/^https:\/\/[^\s]+$/.test(url)) return { error: "url must be an https blob url", status: 400 };
  if (!blobConfigured()) return NOT_CONFIGURED;
  try {
    await del(url);
    return { success: true };
  } catch (e) {
    console.error("[admin] blob del", e instanceof Error ? e.message : e);
    return { error: "The delete failed", status: 502 };
  }
}
