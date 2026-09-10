"use client";
// Mounts the analytics tracker and reports a pageview on every route change.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pageview, startTracker } from "@/lib/tracker";

export default function Tracker() {
  useEffect(() => startTracker(), []);
  const path = usePathname();
  useEffect(() => { pageview(); }, [path]);
  return null;
}
