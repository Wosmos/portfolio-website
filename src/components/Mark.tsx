/* eslint-disable @next/next/no-img-element -- the two brand marks are tiny inline SVGs; next/image
   would add a loader round-trip and cannot optimise SVG without relaxing its security defaults. */

export function WMark({ className, width = 40, height = 26 }: { className?: string; width?: number; height?: number }) {
  return <img className={className} src="/v3/wosmo-w.svg" alt="" width={width} height={height} />;
}
export function Wordmark({ className, width = 78, height = 12, alt = "wosmo" }: { className?: string; width?: number; height?: number; alt?: string }) {
  return <img className={className} src="/v3/wosmo-full.svg" alt={alt} width={width} height={height} />;
}
