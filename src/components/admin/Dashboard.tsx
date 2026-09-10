"use client";
// The admin shell: a sidebar of resources, one manager mounted at a time. Managers are code-split so
// opening the panel does not download the planet editor or the analytics charts you are not looking at.

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, Toasts, useToast } from "./kit";
import { WMark } from "@/components/Mark";

const Overview = dynamic(() => import("./panels/Overview"), { loading: () => <Skeleton rows={4} />, ssr: false });
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

type TabId = "overview" | "inbox" | "visitors" | "projects" | "scene" | "experience" | "skills" | "education" | "testimonials" | "facts" | "posts" | "profile";
interface Tab { id: TabId; label: string; icon: string; blurb: string }

const TABS: readonly Tab[] = [
  { id: "overview", label: "Overview", icon: "◧", blurb: "Traffic, engagement and where people come from." },
  { id: "inbox", label: "Inbox", icon: "✉", blurb: "Every message the contact form has sent, with its state and a reply box." },
  { id: "visitors", label: "Visitors", icon: "◎", blurb: "One row per profile: how often they come back and what they opened." },
  { id: "projects", label: "Projects", icon: "◍", blurb: "Content, links, and each project's own planet." },
  { id: "scene", label: "Solar system", icon: "☀", blurb: "The sun, the orbits, the belt and the sky — everything that used to be hardcoded." },
  { id: "experience", label: "Experience", icon: "▤", blurb: "Jobs, dates and the bullets under each one." },
  { id: "skills", label: "Skills", icon: "⬒", blurb: "The groups the skills matrix renders." },
  { id: "education", label: "Education", icon: "⌂", blurb: "Degrees and grades." },
  { id: "testimonials", label: "Testimonials", icon: "❝", blurb: "Quotes. Anything marked as a sample is labelled as one on the site." },
  { id: "facts", label: "Secrets", icon: "✦", blurb: "The lines the flight deck whispers when a visitor finds one of its twenty secrets." },
  { id: "posts", label: "Blog", icon: "✎", blurb: "Write, draft and publish." },
  { id: "profile", label: "Profile", icon: "☺", blurb: "Name, contact details, the summary and the résumé link." },
];

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

function Shell() {
  const [tab, setTab] = useState<TabId>("overview");
  const router = useRouter();
  const { say } = useToast();
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  async function signOut(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }
  async function clearCache(): Promise<void> {
    const r = await fetch("/api/admin/revalidate", { method: "POST" });
    say(r.ok ? "the public pages will rebuild on the next request" : "could not clear the cache", !r.ok);
  }

  return (
    <div className="adm">
      <aside className="adm__side">
        <div className="adm__brand"><WMark height={20} /><b>wosmo</b> · admin</div>
        <nav className="adm__tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`adm__tab${t.id === tab ? " is-on" : ""}`} onClick={() => setTab(t.id)} aria-current={t.id === tab ? "true" : undefined}>
              <i aria-hidden="true">{t.icon}</i>{t.label}
            </button>
          ))}
        </nav>
        <div className="adm__foot">
          <a href="/read" target="_blank" rel="noopener">↗ view the site</a>
          <button type="button" onClick={() => void clearCache()}>⟳ clear the cache</button>
          <button type="button" onClick={() => void signOut()}>⏻ sign out</button>
        </div>
      </aside>
      <main className="adm__main">
        <div className="adm__bar">
          <h1>{active?.label}</h1>
          <p>{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</p>
        </div>
        {active?.blurb && <p className="adm__hint">{active.blurb}</p>}
        <Panel id={tab} />
      </main>
    </div>
  );
}

export default function Dashboard() {
  return <Toasts><Shell /></Toasts>;
}
