import { ImageResponse } from "next/og";
import { getPerson } from "@/lib/content";
import { clampDescription, markWidth, OG_COLORS as C, OG_CONTENT_TYPE, OG_SIZE, SITE_HOST, SITE_NAME, WORDMARK, W_MARK } from "@/lib/seo";

export const alt = "wosmo — Wasif Malik, software engineer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// The brand card every shared link falls back to: the trademark, the name, and one line of what I do.
// Satori needs an explicit `display: flex` on anything with more than one child.
export default async function OpengraphImage() {
  const person = await getPerson();
  const wH = 116;
  const markH = 44;
  // the clause before the em dash is a whole sentence; what follows only repeats the kicker line
  const [lead] = person.positioning.split("\u2014");
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
          padding: 80, background: C.sky, color: C.ink, fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 30 }}>
          <img src={W_MARK.src} width={markWidth(W_MARK, wH)} height={wH} alt="" />
          <img src={WORDMARK.src} width={markWidth(WORDMARK, markH)} height={markH} alt={SITE_NAME} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 42 }}>
          <div style={{ width: 104, height: 6, borderRadius: 3, background: C.cyan }} />
          <div style={{ width: 34, height: 6, borderRadius: 3, background: C.magenta }} />
        </div>

        <div style={{ fontSize: 24, letterSpacing: 8, marginTop: 26, color: C.cyan, textTransform: "uppercase" }}>
          {`${person.role} · ${person.line}`}
        </div>
        <div style={{ fontSize: 92, fontWeight: 700, marginTop: 12, letterSpacing: -2 }}>{person.name}</div>
        <div style={{ fontSize: 30, marginTop: 26, maxWidth: 940, lineHeight: 1.4, color: C.dim }}>
          {clampDescription(lead, 130)}
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 44, fontSize: 22, color: C.faint }}>
          <span>{SITE_HOST}</span>
          <span style={{ color: C.magenta }}>·</span>
          <span>open to remote roles</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
