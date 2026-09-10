import { ImageResponse } from "next/og";
import { person } from "@/data/portfolio";

export const alt = `${person.name} — Software Engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamic Open Graph card, rendered at request time and cached, so social shares (LinkedIn, X, Slack)
// get a real 1200×630 preview. Colours match the site's tokens.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80,
          background: "radial-gradient(circle at 18% 16%, #0d2440 0%, #07090f 58%, #050508 100%)",
          color: "#f2f5ff", fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 8, color: "#00e5ff", textTransform: "uppercase" }}>Software Engineer</div>
        <div style={{ fontSize: 104, fontWeight: 700, marginTop: 14, letterSpacing: -2 }}>{person.name}</div>
        <div style={{ fontSize: 32, marginTop: 26, maxWidth: 940, lineHeight: 1.35, color: "#9fb0cc" }}>
          Production web applications and systems-level software — concurrent Go backends, Next.js frontends, security-first architecture.
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 44, fontSize: 26, color: "#00e5ff" }}>
          <span>Go</span><span style={{ color: "#33507a" }}>·</span>
          <span>Next.js</span><span style={{ color: "#33507a" }}>·</span>
          <span>TypeScript</span><span style={{ color: "#33507a" }}>·</span>
          <span>PostgreSQL</span><span style={{ color: "#33507a" }}>·</span>
          <span>WebGL</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
