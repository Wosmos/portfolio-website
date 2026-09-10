"use client";
// Renders nothing on the first paint so the server and client markup always agree.

import { useEffect, useState } from "react";
import { person } from "@/data/portfolio";

const city = person.location.split(",")[0]?.toLowerCase() ?? "";

export default function LocalTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = (): void => setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: person.tz }));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return <span>{time ? `${time} in ${city}` : `${city} time`}</span>;
}
