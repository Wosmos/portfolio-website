"use client";
// Three clicks on the footer wordmark inside a second and a half ask the server where the panel is.
// It wraps the mark rather than replacing it: the mark is an <img>, not a link, so there is no
// navigation to suppress and nothing to preventDefault — a stray single click still does nothing at
// all. No cursor, no hover, no title: it should look exactly as inert as it did before.

import { useRef, type ReactNode } from "react";

const NEEDED = 3;
const WINDOW_MS = 1500;

export default function AdminGate({ children }: { children: ReactNode }) {
  const hits = useRef<number[]>([]);
  const asking = useRef(false);

  async function knock(): Promise<void> {
    const now = Date.now();
    hits.current = [...hits.current, now].filter((at) => now - at < WINDOW_MS);
    if (hits.current.length < NEEDED || asking.current) return;
    hits.current = [];
    asking.current = true;
    try {
      const response = await fetch("/api/admin/knock", { method: "POST", cache: "no-store" });
      const body: unknown = await response.json();
      const path: unknown = typeof body === "object" && body !== null ? Reflect.get(body, "path") : null;
      // A leading slash and no protocol-relative "//": the server is trusted, the shape is not.
      if (response.ok && typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
        window.location.assign(path);
        return;
      }
    } catch {
      // Silence is the right answer: nobody who is not the owner should learn that a knock exists.
    }
    asking.current = false;
  }

  return <span onClick={() => void knock()}>{children}</span>;
}
