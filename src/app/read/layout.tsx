import type { ReactNode } from "react";
import ReadShell from "@/components/read/ReadShell";
import SiteHeader from "@/components/read/SiteHeader";
import SiteFooter from "@/components/read/SiteFooter";
import "@/styles/read.css";
import HashScroll from "@/components/read/HashScroll";
import { getPerson, getPosts } from "@/lib/content";

export default async function ReadLayout({ children }: { children: ReactNode }) {
  // one read each, cached: the header/footer are server components, so nothing ships to the client
  const [person, posts] = await Promise.all([getPerson(), getPosts()]);
  return (
    <ReadShell>
      <div className="page">
        <SiteHeader person={person} hasBlog={posts.length > 0} />
        {children}
        <HashScroll />
        <SiteFooter person={person} />
      </div>
    </ReadShell>
  );
}
