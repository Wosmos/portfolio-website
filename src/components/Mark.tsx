/* eslint-disable @next/next/no-img-element -- the two brand marks are tiny inline SVGs; next/image
   would add a loader round-trip and cannot optimise SVG without relaxing its security defaults. */

// Aspect ratios come from the source artwork, so callers only ever set a height.
const W_RATIO = 345.8 / 260.1;      // the W with its dot
const MARK_RATIO = 1291.84 / 260.2; // the full wordmark

export function WMark({ className, height = 26 }: { className?: string; height?: number }) {
  return <img className={className} src="/v3/wosmo-w.svg" alt="" width={Math.round(height * W_RATIO)} height={height} />;
}
export function Wordmark({ className, height = 12, alt = "wosmo" }: { className?: string; height?: number; alt?: string }) {
  return <img className={className} src="/v3/wosmo-full.svg" alt={alt} width={Math.round(height * MARK_RATIO)} height={height} />;
}
