import { ImageResponse } from "next/og";
import { getProjects } from "@/lib/content";
import { markWidth, OG_COLORS as C, OG_CONTENT_TYPE, OG_SIZE, SITE_HOST, SITE_NAME, WORDMARK, W_MARK } from "@/lib/seo";

export const alt = "wosmo flight deck — the projects as a solar system";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// The deck's own card: one dot per planet, so a shared link looks like the thing it opens.
// Satori needs an explicit `display: flex` on anything with more than one child.
export default async function ShipOgImage() {
  const projects = await getProjects();
  const wH = 92;
  const markH = 34;
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
          padding: 80, background: C.sky, color: C.ink, fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
          <img src={W_MARK.src} width={markWidth(W_MARK, wH)} height={wH} alt="" />
          <img src={WORDMARK.src} width={markWidth(WORDMARK, markH)} height={markH} alt={SITE_NAME} />
        </div>

        <div style={{ fontSize: 24, letterSpacing: 8, marginTop: 40, color: C.cyan, textTransform: "uppercase" }}>
          flight deck · webgl
        </div>
        <div style={{ fontSize: 88, fontWeight: 700, marginTop: 12, letterSpacing: -2 }}>Fly the projects</div>
        <div style={{ fontSize: 30, marginTop: 22, maxWidth: 940, lineHeight: 1.4, color: C.dim }}>
          {`${projects.length} planets, one per project. Drag to fly, cut one open to see what it is built from.`}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 40 }}>
          {projects.map((p, i) => (
            <div
              key={p.id}
              style={{
                width: 12 + i * 2, height: 12 + i * 2, borderRadius: 999,
                background: i === 0 ? C.magenta : i % 3 === 0 ? C.cyan : "#33507a",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 36, fontSize: 22, color: C.faint }}>
          <span>{`${SITE_HOST}/ship`}</span>
          <span style={{ color: C.magenta }}>·</span>
          <span>plain pages at /read</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
