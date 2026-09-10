import Link from "next/link";
import { person } from "@/data/portfolio";
import { Wordmark } from "@/components/Mark";

export default function SiteFooter() {
  return (
    <footer className="foot">
      <span><Wordmark className="foot__mark" height={11} /> · {person.location} · {person.tzLabel}</span>
      <span>
        <a href={person.github} target="_blank" rel="noopener">github</a> · <a href={person.linkedin} target="_blank" rel="noopener">linkedin</a> · <a href={`mailto:${person.email}`}>{person.email}</a> · <Link href="/?gate=1">read / fly</Link>
      </span>
    </footer>
  );
}
