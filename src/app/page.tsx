import type { Metadata } from "next";
import Stars from "@/components/Stars";
import Gate from "@/components/gate/Gate";
import { person } from "@/data/portfolio";
import "@/styles/gate.css";
import { WMark, Wordmark } from "@/components/Mark";

export const metadata: Metadata = {
  title: `${person.name} — software engineer`,
  description: `${person.name} · software engineer · Go, systems, Next.js. Read the résumé or fly the flight deck.`,
  alternates: { canonical: "/" },
};

export default function GatePage() {
  return (
    <>
      <Stars parallax={false} />
      <div className="gate__glow" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <main className="gate">
        <WMark className="gate__w" width={248} height={160} />
        <Wordmark className="gate__mark" width={180} height={28} />
        <h1 className="gate__role">software engineer</h1>
        <p className="gate__line">{person.name} · Go, systems, Next.js. Same work, two ways in. Pick one; you can switch any time.</p>
        <Gate />
        <p className="gate__foot">or just the <a href={person.cv} target="_blank" rel="noopener">résumé pdf ↗</a></p>
      </main>
    </>
  );
}
