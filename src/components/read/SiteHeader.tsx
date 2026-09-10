import Link from "next/link";
import { person } from "@/data/portfolio";
import NavLinks from "./NavLinks";
import SoundToggle from "./SoundToggle";
import FlyLink from "./FlyLink";
import { WMark, Wordmark } from "@/components/Mark";
import ResumeLink from "./ResumeLink";

export default function SiteHeader() {
  return (
    <header className="top">
      <Link className="top__brand" href="/read" aria-label={`${person.name} — home`}>
        <WMark className="top__w" />
        <Wordmark className="top__mark" />
      </Link>
      <NavLinks />
      <div className="top__tools">
        <ResumeLink href={person.cv} from="header"><span className="sf__in">résumé ↓</span></ResumeLink>
        <SoundToggle />
        <FlyLink className="sf pill is-mg" title="Switch to the flight deck"><span className="sf__in">fly ↗</span></FlyLink>
      </div>
      <i className="top__bar" aria-hidden="true" />
    </header>
  );
}
