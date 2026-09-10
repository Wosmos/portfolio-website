"use client";
// A link into the flight deck that also remembers "fly" as the visitor's door.
import type { ReactNode } from "react";
import { rememberDoor } from "@/lib/sound-client";

export default function FlyLink({ to, className, title, children }: { to?: string; className?: string; title?: string; children: ReactNode }) {
  const href = to ? `/ship?to=${encodeURIComponent(to)}` : "/ship";
  return <a className={className} href={href} title={title} onClick={() => rememberDoor("fly")}>{children}</a>;
}
