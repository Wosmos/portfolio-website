"use client";
// The admin shell: a grouped sidebar, one panel mounted at a time, a command palette and a publish
// button. Panels are code-split so opening the panel does not download the planet editor or the
// charts you are not looking at.
//
// The open panel lives in the URL hash, so a reload, a bookmark and the back button all land where you
// were. It is read once on mount rather than synced from an effect.

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, Toasts, useToast } from "./kit";
import { invalidate } from "@/lib/admin-cache";
import { WMark } from "@/components/Mark";
import "@/styles/admin-dash.css";

const Overview = dynamic(() => import("./panels/Overview"), { loading: () => <Skeleton rows={5} />, ssr: false });
const Inbox = dynamic(() => import("./panels/Inbox"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Visitors = dynamic(() => import("./panels/Visitors"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Projects = dynamic(() => import("./panels/Projects"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Scene = dynamic(() => import("./panels/Scene"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Experience = dynamic(() => import("./panels/Experience"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Skills = dynamic(() => import("./panels/Skills"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Education = dynamic(() => import("./panels/Education"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Testimonials = dynamic(() => import("./panels/Testimonials"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Facts = dynamic(() => import("./panels/Facts"), { loading: () => <Skeleton rows={3} />, ssr: false });
const Posts = dynamic(() => import("./panels/Posts"), { loading: () => <Skeleton rows={4} />, ssr: false });
const Profile = dynamic(() => import("./panels/Profile"), { loading: () => <Skeleton rows={4} />, ssr: false });

type TabId =
  | "overview" | "inbox" | "visitors"
  | "projects" | "scene" | "experience" | "skills" | "education" | "testimonials" | "facts" | "posts"
  | "profile";
type Group = "insight" | "content" | "you";

interface Tab { id: TabId; label: string; icon: string; group: Group; blurb: string; keys?: string }

const TABS: readonly Tab[] = [
  { id: "overview", label: "Overview", icon: "◧", group: "insight", blurb: "Traffic, attention, the path to a message, and where people come from." },
  { id: "inbox", label: "Inbox", icon: "✉", group: "insight", blurb: "Every message the contact form has sent, with its state and a reply box." },
  { id: "visitors", label: "Visitors", icon: "◎", group: "insight", blurb: "One row per profile, scored by how interested they looked. Your own visits are excluded." },
  { id: "projects", label: "Projects", icon: "◍", group: "content", blurb: "Content, links, and each project's own planet." },
  { id: "scene", label: "Solar system", icon: "☀", group: "content", blurb: "The sun, the orbits, the belt and the sky — everything that used to be hardcoded." },
  { id: "experience", label: "Experience", icon: "▤", group: "content", blurb: "Jobs, dates and the bullets under each one." },
  { id: "skills", label: "Skills", icon: "⬒", group: "content", blurb: "The groups the skills matrix renders." },
  { id: "education", label: "Education", icon: "⌂", group: "content", blurb: "Degrees and grades." },
  { id: "testimonials", label: "Testimonials", icon: "❝", group: "content", blurb: "Quotes. Anything marked as a sample is labelled as one on the site." },
  { id: "facts", label: "Secrets", icon: "✦", group: "content", blurb: "The lines the flight deck whispers when a visitor finds one of its twenty hidden things." },
  { id: "posts", label: "Blog", icon: "✎", group: "content", blurb: "Write, draft and publish." },
  { id: "profile", label: "Profile", icon: "☺", group: "you", blurb: "Name, contact details, both descriptions and the résumé link." },
];

const GROUPS: readonly { id: Group; label: string }[] = [
  { id: "insight", label: "what happened" },
  { id: "content", label: "what the site says" },
  { id: "you", label: "you" },
];

const isTab = (v: string): v is TabId => TABS.some((t) => t.id === v);

function Panel({ id }: { id: TabId }) {
  switch (id) {
    case "overview": return <Overview />;
    case "inbox": return <Inbox />;
    case "visitors": return <Visitors />;
    case "projects": return <Projects />;
    case "scene": return <Scene />;
    case "experience": return <Experience />;
    case "skills": return <Skills />;
    case "education": return <Education />;
    case "testimonials": return <Testimonials />;
    case "facts": return <Facts />;
    case "posts": return <Posts />;
    case "profile": return <Profile />;
  }
}

/** Reads the hash once, at mount, so the first render is already on the right panel. */
function initialTab(): TabId {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace("#", "");
  return isTab(hash) ? hash : "overview";
}

function Palette({ onPick, onClose }: { onPick: (id: TabId) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TABS;
    return TABS.filter((t) => t.label.toLowerCase().includes(needle) || t.blurb.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="pal" role="dialog" aria-modal="true" aria-label="Jump to a panel">
      <button className="pal__scrim" type="button" aria-label="Close" onClick={onClose} />
      <div className="pal__box sf">
        <div className="sf__in">
          <input
            className="pal__in" autoFocus value={q} placeholder="jump to…" aria-label="Search the panels"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && hits[0]) onPick(hits[0].id);
            }}
          />
          <ul className="pal__list">
            {hits.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onPick(t.id)}><i aria-hidden="true">{t.icon}</i><b>{t.label}</b><span>{t.blurb}</span></button>
              </li>
            ))}
            {!hits.length && <li className="pal__none">nothing matches that.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();
  const { say } = useToast();
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const go = useCallback((id: TabId): void => {
    setTab(id);
    setMenu(false);
    setPalette(false);
    if (typeof window !== "undefined") history.replaceState(null, "", `#${id}`);
  }, []);

  // ⌘K / ctrl-K opens the palette; Escape closes whatever is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPalette((v) => !v); }
      if (e.key === "Escape") { setPalette(false); setMenu(false); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // the panel can change under us from another tab; the hash is the source of truth
  useEffect(() => {
    const onHash = (): void => {
      const next = location.hash.replace("#", "");
      if (isTab(next)) setTab(next);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  async function signOut(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/");
  }

  async function publish(): Promise<void> {
    setPublishing(true);
    try {
      const r = await fetch("/api/admin/revalidate", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const body: unknown = await r.json().catch(() => null);
      const dropped = typeof body === "object" && body !== null ? Reflect.get(body, "dropped") : null;
      const count = Array.isArray(dropped) ? dropped.length : 0;
      say(r.ok ? `published · ${count} cached ${count === 1 ? "entry" : "entries"} dropped` : "could not publish", !r.ok);
      invalidate("stats");
    } catch { say("could not publish", true); }
    setPublishing(false);
  }

  return (
    <div className={`adm${menu ? " is-menu" : ""}`}>
      <aside className="adm__side" id="adm-side">
        <div className="adm__brand">
          <WMark height={20} /><b>wosmo</b> <span>admin</span>
        </div>
        <nav className="adm__tabs" aria-label="Sections">
          {GROUPS.map((g) => (
            <div key={g.id} className="adm__group">
              <p className="adm__grouph">{g.label}</p>
              {TABS.filter((t) => t.group === g.id).map((t) => (
                <button
                  key={t.id} type="button" className={`adm__tab${t.id === tab ? " is-on" : ""}`}
                  onClick={() => go(t.id)} aria-current={t.id === tab ? "true" : undefined}
                >
                  <i aria-hidden="true">{t.icon}</i>{t.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm__foot">
          <button type="button" onClick={() => setPalette(true)}>⌘K jump to…</button>
          <a href="/read" target="_blank" rel="noopener">↗ view the site</a>
          <button type="button" onClick={() => void signOut()}>⏻ sign out</button>
        </div>
      </aside>

      <main className="adm__main">
        <div className="adm__bar">
          <button className="adm__burger" type="button" aria-expanded={menu} aria-controls="adm-side" onClick={() => setMenu((v) => !v)}>
            <i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /><span>menu</span>
          </button>
          <div className="adm__title">
            <h1>{active?.label}</h1>
            {active?.blurb && <p>{active.blurb}</p>}
          </div>
          <button className="btn btn--sm" type="button" onClick={() => void publish()} disabled={publishing} title="Drop the cached pages so the public site rebuilds now">
            {publishing ? "publishing…" : "⟳ publish"}
          </button>
        </div>
        <div className="adm__body">
          <Panel id={tab} />
        </div>
      </main>

      {palette && <Palette onPick={go} onClose={() => setPalette(false)} />}
      {menu && <button className="adm__scrim" type="button" aria-label="Close the menu" onClick={() => setMenu(false)} />}
    </div>
  );
}

export default function Dashboard() {
  return <Toasts><Shell /></Toasts>;
}
