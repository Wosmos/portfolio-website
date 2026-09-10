/* eslint-disable @next/next/no-img-element -- the two brand marks are tiny SVGs; next/image would add
   a loader round-trip and cannot optimise SVG without relaxing its security defaults. Importing them
   instead of hardcoding /v3 paths gives each file a content hash, so a changed mark is never cached. */
import wMark from "@/assets/wosmo-w.svg";
import wordmark from "@/assets/wosmo-full.svg";

// Intrinsic sizes come from each file, so a caller only ever sets a height.
const ratio = (a: { width: number; height: number }): number => a.width / a.height;

export function WMark({ className, height = 26 }: { className?: string; height?: number }) {
  return <img className={className} src={wMark.src} alt="" width={Math.round(height * ratio(wMark))} height={height} />;
}
export function Wordmark({ className, height = 12, alt = "wosmo" }: { className?: string; height?: number; alt?: string }) {
  return <img className={className} src={wordmark.src} alt={alt} width={Math.round(height * ratio(wordmark))} height={height} />;
}
