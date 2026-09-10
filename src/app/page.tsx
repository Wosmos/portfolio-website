import type { Metadata } from "next";
import Stars from "@/components/Stars";
import Gate from "@/components/gate/Gate";
import { person } from "@/data/portfolio";
import "@/styles/gate.css";
import { WMark, Wordmark } from "@/components/Mark";

// no `title` here: the gate is the homepage, so it keeps the layout's full default title rather than
// running it through the `%s — Wasif Malik` template and repeating the name.
const DESCRIPTION = `${person.name} · software engineer · Go, systems, Next.js. Read the résumé or fly the flight deck.`;

export const metadata: Metadata = {
  description: DESCRIPTION,
  // `alternates` is replaced wholesale per page, so the llms.txt pointer is repeated here
  alternates: { canonical: "/", types: { "text/plain": "/llms.txt" } },
  openGraph: { type: "website", url: "/", description: DESCRIPTION },
};

export default function GatePage() {
  return (
    <>
      <Stars parallax={false} />
      <div className="gate__glow" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <main className="gate">
        <WMark className="gate__w" height={160} />
        <Wordmark className="gate__mark" height={28} />
        <h1 className="gate__role">software engineer</h1>
        <p className="gate__line">{person.name} · Go, systems, Next.js. Same work, two ways in. Pick one; you can switch any time.</p>
        <Gate />
        <p className="gate__foot">or just the <a href={person.cv} target="_blank" rel="noopener">résumé pdf ↗</a></p>
      </main>
    </>
  );
}
