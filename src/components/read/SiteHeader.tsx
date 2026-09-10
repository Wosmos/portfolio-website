import Link from "next/link";
import { person } from "@/data/portfolio";
import NavLinks from "./NavLinks";
import SoundToggle from "./SoundToggle";
import FlyLink from "./FlyLink";
import { WMark, Wordmark } from "@/components/Mark";

export default function SiteHeader() {
  return (
    <header className="top">
      <Link className="top__brand" href="/read" aria-label={`${person.name} — home`}>
        <WMark className="top__w" />
        <Wordmark className="top__mark" />
      </Link>
      <NavLinks />
      <div className="top__tools">
        <a className="sf pill" href={person.cv} target="_blank" rel="noopener" title="Résumé PDF"><span className="sf__in">résumé ↓</span></a>
        <SoundToggle />
        <FlyLink className="sf pill is-mg" title="Switch to the flight deck"><span className="sf__in">fly ↗</span></FlyLink>
      </div>
      <i className="top__bar" aria-hidden="true" />
    </header>
  );
}
