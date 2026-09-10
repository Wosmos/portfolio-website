"use client";
import { useSyncExternalStore } from "react";
import { getAudio, setMutedStored } from "@/lib/sound-client";

const subscribe = (fn: () => void): (() => void) => getAudio().onChange(fn);

export default function SoundToggle() {
  // server snapshot is "on": the real value is only known once the client reads localStorage
  const muted = useSyncExternalStore(subscribe, () => getAudio().muted, () => false);
  return (
    <button className={`sf pill${muted ? " is-off" : ""}`} type="button" aria-pressed={!muted} title="Sound" onClick={() => setMutedStored(!muted)}>
      <span className="sf__in"><i className="eq" aria-hidden="true"><b /><b /><b /></i>snd</span>
    </button>
  );
}
