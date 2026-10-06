// Which picture stands for a project on the reading site. In order: the cover image set in the admin
// (an upload lands in the Vercel Blob store, or a path under /public), then the screenshot committed
// at public/projects/<id>.jpg, then nothing, and the page draws a title card in the same box.

/** The Blob store the admin uploads to. next.config.ts lets next/image optimise it, and the CSP allows it. */
export const BLOB_HOST = "fggnxvf87yifjcf8.public.blob.vercel-storage.com";

/** Projects with a committed 1440x900 capture of their live site. The ones with no live site have none. */
const STATIC_SHOTS: ReadonlySet<string> = new Set(["zcrypt", "learnity", "docxo", "devtoolshq", "scrappo", "resumeright"]);

/**
 * A cover the page can render through next/image: a local path without a query string, or an https
 * url on the Blob store. Any other host is refused by the CSP and by next/image itself, so a cover
 * pasted from elsewhere falls through to the fallback instead of breaking the page.
 */
export function usableCover(url: string): boolean {
  if (url.startsWith("/")) return !url.startsWith("//") && !url.includes("?");
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === BLOB_HOST;
  } catch {
    return false;
  }
}

export function projectShot(p: { id: string; coverImage?: string }): string | null {
  const cover = p.coverImage?.trim() ?? "";
  if (cover && usableCover(cover)) return cover;
  return STATIC_SHOTS.has(p.id) ? `/projects/${p.id}.jpg` : null;
}
