import type { ReactNode } from "react";
import ReadShell from "@/components/read/ReadShell";
import SiteHeader from "@/components/read/SiteHeader";
import SiteFooter from "@/components/read/SiteFooter";
import "@/styles/read.css";

export default function ReadLayout({ children }: { children: ReactNode }) {
  return (
    <ReadShell>
      <div className="page">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </ReadShell>
  );
}
