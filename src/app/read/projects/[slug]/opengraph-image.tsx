import { ImageResponse } from "next/og";
import { LANG_COLORS } from "@/data/portfolio";
import { getPerson, getProject, getProjects } from "@/lib/content";

export const alt = "Project — Wasif Malik";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await getProjects()).map((p) => ({ slug: p.id }));
}

// A card per project, so a shared link shows the project's own name, one line about it, and the
// language split that the planet's layers are built from.
export default async function ProjectOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, person] = await Promise.all([getProject(slug), getPerson()]);
  const langs = (p?.langs ?? []).slice(0, 5);
  const total = langs.reduce((a, l) => a + l[1], 0) || 1;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80,
          background: "radial-gradient(circle at 18% 16%, #0d2440 0%, #07090f 58%, #050508 100%)",
          color: "#f2f5ff", fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 8, color: "#00e5ff", textTransform: "uppercase" }}>
          {p ? `${p.category} · ${p.live ? "live" : "open source"}` : "project"}
        </div>
        <div style={{ fontSize: 92, fontWeight: 700, marginTop: 14, letterSpacing: -2 }}>{p?.title ?? "Projects"}</div>
        <div style={{ fontSize: 30, marginTop: 20, maxWidth: 900, lineHeight: 1.35, color: "#9fb0cc" }}>{p?.tagline ?? "Eight things I shipped."}</div>
        {langs.length > 0 && (
          <div style={{ display: "flex", marginTop: 44, height: 12, width: 940 }}>
            {langs.map(([name, pct]) => (
              <div key={name} style={{ width: `${(pct / total) * 100}%`, background: `#${(LANG_COLORS[name] ?? 0xededed).toString(16).padStart(6, "0")}` }} />
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 20, marginTop: 22, fontSize: 22, color: "#7d8ba6" }}>
          {langs.map(([name, pct]) => <span key={name}>{`${name} ${pct.toFixed(0)}%`}</span>)}
        </div>
        <div style={{ marginTop: 40, fontSize: 22, color: "#5d6a82" }}>{`${person.name} · wosmos.vercel.app`}</div>
      </div>
    ),
    { ...size },
  );
}
