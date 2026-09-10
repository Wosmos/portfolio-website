"use client";
// Client-only boundary for the deck: WebGL and three.js must never run during SSR, and the boot screen
// doubles as the loading state so there is no flash.

import dynamic from "next/dynamic";
import type { ShipDeckProps } from "./ShipDeck";
import { WMark, Wordmark } from "@/components/Mark";

const ShipDeck = dynamic(() => import("./ShipDeck"), {
  ssr: false,
  loading: () => (
    <section className="boot" aria-label="Loading the flight deck">
      <WMark className="boot__w" width={248} height={160} />
      <Wordmark className="boot__mark" width={180} height={28} />
      <p className="boot__role">software engineer</p>
    </section>
  ),
});

export default function ShipLoader(props: ShipDeckProps) {
  return <ShipDeck {...props} />;
}
