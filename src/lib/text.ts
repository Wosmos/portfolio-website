// Small pure helpers shared by server and client code.

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const hostOf = (url: string): string => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
export const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
/** "2025-01" → "Jan 2025"; null → "present". */
export function ym(s: string | null): string {
  if (!s) return "present";
  const [y, m] = s.split("-");
  const idx = m ? Number(m) - 1 : -1;
  return idx >= 0 ? `${MONTHS[idx] ?? m} ${y}` : (y ?? "");
}
/** Inclusive month count between two "YYYY-MM" strings (end null = now). */
export function monthsBetween(a: string, b: string | null, now = new Date()): number {
  const [ay = 0, am = 1] = a.split("-").map(Number);
  const [by, bm] = b ? b.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  return ((by ?? 0) - ay) * 12 + ((bm ?? 1) - am) + 1;
}
export function spanLabel(m: number): string {
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12), r = m % 12;
  return `${y} yr${y > 1 ? "s" : ""}${r ? ` ${r} mo` : ""}`;
}
export function ago(iso: string, now = Date.now()): string {
  const s = (now - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
