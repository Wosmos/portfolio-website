import { ImageResponse } from "next/og";

export const alt = "Wasif Malik — Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamic Open Graph card. Rendered at build/request time so social shares
// (LinkedIn, X, Slack) get a real 1200x630 preview instead of a blank card.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(circle at 20% 20%, #0b1e3f 0%, #060913 55%, #02040a 100%)",
          color: "#e8f1ff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 30,
            letterSpacing: 6,
            color: "#00d4ff",
            textTransform: "uppercase",
          }}
        >
          Software Engineer
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, marginTop: 12 }}>
          Wasif Malik
        </div>
        <div
          style={{
            fontSize: 34,
            marginTop: 24,
            maxWidth: 900,
            lineHeight: 1.35,
            color: "#9db4d4",
          }}
        >
          Production web apps and systems-level software — concurrent Go
          backends, Next.js frontends, security-first architecture.
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 40, fontSize: 26, color: "#00d4ff" }}>
          <span>Go</span>
          <span style={{ color: "#33507a" }}>·</span>
          <span>Next.js</span>
          <span style={{ color: "#33507a" }}>·</span>
          <span>TypeScript</span>
          <span style={{ color: "#33507a" }}>·</span>
          <span>PostgreSQL</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
