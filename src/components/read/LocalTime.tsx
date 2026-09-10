"use client";
// Renders nothing on the first paint so the server and client markup always agree.
// `tz`/`location` come from the server page (the database); the static record is the fallback.

import { useEffect, useState } from "react";
import { person as staticPerson } from "@/data/portfolio";

export default function LocalTime({ tz = staticPerson.tz, location = staticPerson.location }: { tz?: string; location?: string }) {
  const city = location.split(",")[0]?.toLowerCase() ?? "";
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = (): void => setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [tz]);
  return <span>{time ? `${time} in ${city}` : `${city} time`}</span>;
}
