"use client";
// The shared pieces every manager needs: toasts, a CRUD hook over /api/admin/<resource>, drag ordering,
// and the small form controls. Keeping them here is what makes each manager short enough to read.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// ── toasts ──
interface Toast { id: number; text: string; bad?: boolean }
interface ToastApi { say: (text: string, bad?: boolean) => void }
const ToastCtx = createContext<ToastApi>({ say: () => undefined });
export const useToast = (): ToastApi => useContext(ToastCtx);

export function Toasts({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const say = useCallback((text: string, bad?: boolean) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, text, bad }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ say }}>
      {children}
      <div className="adm__toasts" role="status" aria-live="polite">
        {list.map((t) => <div key={t.id} className={`adm__toast${t.bad ? " is-bad" : ""}`}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

// ── data ──
export interface WithId { id: number; sortOrder?: number }
interface Resource<T> {
  items: T[]; loading: boolean; error: string;
  create: (data: Partial<T>) => Promise<boolean>;
  update: (data: Partial<T> & { id: number }) => Promise<boolean>;
  remove: (id: number) => Promise<boolean>;
  reorder: (items: T[]) => Promise<void>;
  refresh: () => Promise<void>;
}

async function call(path: string, init?: RequestInit): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  try {
    const r = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
    const body: unknown = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = typeof body === "object" && body !== null && "error" in body ? String((body as { error: unknown }).error) : `request failed (${r.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, error: "no connection" };
  }
}

/** CRUD against /api/admin/<resource>. Every mutation refetches, so the list is never a guess. */
export function useResource<T extends WithId>(resource: string): Resource<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const { say } = useToast();

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const refresh = useCallback(async () => {
    const res = await call(`/api/admin/${resource}`);   // `loading` starts true and is cleared here
    if (!alive.current) return;
    if (res.ok) { setItems(Array.isArray(res.data) ? (res.data as T[]) : res.data ? [res.data as T] : []); setError(""); }
    else setError(res.error ?? "could not load");
    setLoading(false);
  }, [resource]);

  // The state updates inside `refresh` happen after an await, so they answer the fetch resolving rather
  // than cascading synchronously while the effect runs; the rule cannot see through the call.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = async (init: RequestInit, okText: string): Promise<boolean> => {
    const res = await call(`/api/admin/${resource}`, init);
    if (!res.ok) { say(res.error ?? "failed", true); return false; }
    say(okText);
    await refresh();
    return true;
  };

  return {
    items, loading, error, refresh,
    create: (data) => mutate({ method: "POST", body: JSON.stringify(data) }, "created"),
    update: (data) => mutate({ method: "PUT", body: JSON.stringify(data) }, "saved"),
    remove: async (id) => {
      const res = await call(`/api/admin/${resource}?id=${id}`, { method: "DELETE" });
      if (!res.ok) { say(res.error ?? "could not delete", true); return false; }
      say("deleted");
      await refresh();
      return true;
    },
    reorder: async (next) => {
      setItems(next);   // optimistic: the list should not jump while dragging
      const res = await call(`/api/admin/${resource}`, { method: "PUT", body: JSON.stringify({ reorder: next.map((x, i) => ({ id: x.id, sortOrder: i })) }) });
      if (!res.ok) { say(res.error ?? "could not save the order", true); await refresh(); }
    },
  };
}

/** Single-row resources (profile, scene): one object, one save. */
export function useSingle<T>(resource: string): { value: T | null; loading: boolean; save: (patch: Partial<T>) => Promise<boolean>; refresh: () => Promise<void> } {
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const { say } = useToast();
  const refresh = useCallback(async () => {
    const res = await call(`/api/admin/${resource}`);
    if (res.ok) setValue((Array.isArray(res.data) ? res.data[0] : res.data) as T);
    else say(res.error ?? "could not load", true);
    setLoading(false);
  }, [resource, say]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- see the note in useResource
  useEffect(() => { void refresh(); }, [refresh]);
  return {
    value, loading, refresh,
    save: async (patch) => {
      const res = await call(`/api/admin/${resource}`, { method: "PUT", body: JSON.stringify(patch) });
      if (!res.ok) { say(res.error ?? "could not save", true); return false; }
      say("saved"); await refresh(); return true;
    },
  };
}

// ── drag ordering ──
export function useDragSort<T extends WithId>(items: T[], onDrop: (next: T[]) => void) {
  const from = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return {
    over,
    props: (index: number) => ({
      draggable: true,
      onDragStart: () => { from.current = index; },
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(index); },
      onDragEnd: () => { from.current = null; setOver(null); },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const start = from.current;
        setOver(null); from.current = null;
        if (start === null || start === index) return;
        const next = [...items];
        const [moved] = next.splice(start, 1);
        if (moved) next.splice(index, 0, moved);
        onDrop(next);
      },
    }),
  };
}

// ── controls ──
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="fld"><label>{label}{hint && <small>{hint}</small>}</label>{children}</div>;
}
export function Text({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
export function Area({ value, onChange, tall, ...rest }: { value: string; onChange: (v: string) => void; tall?: boolean } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  return <textarea className={tall ? "tall" : undefined} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
export function Num({ value, onChange, step = 1, ...rest }: { value: number; onChange: (v: number) => void; step?: number } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "step">) {
  return <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} {...rest} />;
}
export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = `c-${label.replace(/\W+/g, "-")}`;
  return <div className="fld fld--row"><input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><label htmlFor={id}>{label}</label></div>;
}
export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
}
/** An integer colour (0xRRGGBB) edited as a swatch, because that is how the shader stores it. */
export function Colour({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const hex = `#${(value >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
  return <input type="color" value={hex} onChange={(e) => onChange(parseInt(e.target.value.slice(1), 16))} />;
}
/** A string list edited as chips: type and press enter, backspace on an empty box removes the last. */
export function Chips({ value, onChange, placeholder = "add…" }: { value: readonly string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = (): void => { const v = draft.trim(); if (!v) return; onChange([...value, v]); setDraft(""); };
  return (
    <div className="chipedit">
      {value.map((v, i) => (
        <span key={`${v}-${i}`}>{v}<button type="button" aria-label={`remove ${v}`} onClick={() => onChange(value.filter((_, k) => k !== i))}>×</button></span>
      ))}
      <input
        value={draft} placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
      />
    </div>
  );
}
/** Multi-line text edited as one item per line — the shape bullets and notes actually have. */
export function Lines({ value, onChange, rows = 5 }: { value: readonly string[]; onChange: (v: string[]) => void; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value.join("\n")}
      onChange={(e) => onChange(e.target.value.split("\n").map((l) => l.trimStart()).filter((l, i, arr) => l !== "" || i < arr.length - 1))}
      placeholder="one per line"
    />
  );
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="adm__list">{Array.from({ length: rows }, (_, i) => <div className="skel" key={i} />)}</div>;
}
export function Empty({ text }: { text: string }) {
  return <p className="adm__hint">{text}</p>;
}
