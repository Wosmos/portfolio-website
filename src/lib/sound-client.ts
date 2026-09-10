"use client";
// One AudioApi per tab, shared by every client island (header toggle, motion ticks, forms, planets).

import { createAudio, MUTE_KEY, storedMuted, type AudioApi } from "@/lib/audio";

let instance: AudioApi | null = null;

export function getAudio(): AudioApi {
  if (!instance) instance = createAudio({ muted: storedMuted(), ambientGain: 0.7 });
  return instance;
}
export function setMutedStored(v: boolean): void {
  getAudio().setMuted(v);
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* storage may be unavailable */ }
}

export const DOOR_KEY = "v3-door";
export type Door = "read" | "fly";
export function rememberDoor(door: Door): void {
  try { localStorage.setItem(DOOR_KEY, door); } catch { /* storage may be unavailable */ }
}
export function storedDoor(): Door | null {
  try { const d = localStorage.getItem(DOOR_KEY); return d === "read" || d === "fly" ? d : null; } catch { return null; }
}
