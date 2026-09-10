"use client";
// The shared vocabulary every panel is built from: toasts, a CRUD hook over /api/admin/<resource>,
// the form controls, and the list furniture (toolbar, table, pager, detail card). Keeping them here is
// what makes each panel short enough to read — and what makes every panel look the same.

import RLSkeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

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
  /** Nudge one row up or down the stored order — the paginated stand-in for dragging. */
  move: (id: number, dir: -1 | 1) => Promise<void>;
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

/** CRUD against /api/admin/<resource>. Writes land locally first, then refetch, so the list never lags a click. */
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

  const send = useCallback(async (init: RequestInit, okText: string): Promise<boolean> => {
    const res = await call(`/api/admin/${resource}`, init);
    if (!res.ok) { say(res.error ?? "failed", true); await refresh(); return false; }
    say(okText);
    await refresh();
    return true;
  }, [resource, say, refresh]);

  const reorder = useCallback(async (next: T[]) => {
    setItems(next);   // optimistic: the order must not bounce back before the write lands
    const res = await call(`/api/admin/${resource}`, { method: "PUT", body: JSON.stringify({ reorder: next.map((x, i) => ({ id: x.id, sortOrder: i })) }) });
    if (!res.ok) { say(res.error ?? "could not save the order", true); await refresh(); }
  }, [resource, say, refresh]);

  return {
    items, loading, error, refresh, reorder,
    create: (data) => send({ method: "POST", body: JSON.stringify(data) }, "created"),
    update: (data) => {
      setItems((l) => l.map((x) => (x.id === data.id ? { ...x, ...data } : x)));   // optimistic
      return send({ method: "PUT", body: JSON.stringify(data) }, "saved");
    },
    remove: async (id) => {
      setItems((l) => l.filter((x) => x.id !== id));
      const res = await call(`/api/admin/${resource}?id=${id}`, { method: "DELETE" });
      if (!res.ok) { say(res.error ?? "could not delete", true); await refresh(); return false; }
      say("deleted");
      await refresh();
      return true;
    },
    // `items` is this render's list, which is what the row the click came from was drawn from.
    move: async (id, dir) => {
      const at = items.findIndex((x) => x.id === id);
      const to = at + dir;
      if (at < 0 || to < 0 || to >= items.length) return;
      const next = [...items];
      const [moved] = next.splice(at, 1);
      if (moved) next.splice(to, 0, moved);
      await reorder(next);
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

// ── controls ──
export function Field({ label, hint, tip, children }: { label: string; hint?: string; tip?: string; children: ReactNode }) {
  return <div className="fld"><label>{label}{hint && <small>{hint}</small>}{tip && <Tooltip text={tip} />}</label>{children}</div>;
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
/**
 * A range on one line: its name, the track, and the value it currently reads. The explanation is a
 * tooltip rather than a second line, because a form of thirty knobs cannot afford thirty subtitles.
 */
export function Slider({ label, value, onChange, min, max, step = 0.01, tip, unit = "" }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; tip?: string; unit?: string;
}) {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <div className="fld sld">
      <label>{label}{tip && <Tooltip text={tip} />}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      <b className="sld__v">{value.toFixed(decimals)}{unit}</b>
    </div>
  );
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

// ── buttons ──
type Kind = "ghost" | "primary" | "danger";
export function Btn({ kind = "ghost", size = "sm", children, ...rest }: {
  kind?: Kind; size?: "sm" | "md"; children: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const cls = `btn${size === "sm" ? " btn--sm" : ""}${kind === "primary" ? " btn--primary" : ""}${kind === "danger" ? " btn--danger" : ""}`;
  return <button type={rest.type ?? "button"} className={cls} {...rest}>{children}</button>;
}
/** Delete is two clicks everywhere: the button arms itself, then does the thing. Disarms after 3s. */
export function Danger({ label = "delete", armedLabel = "click again", onConfirm, size = "sm" }: {
  label?: string; armedLabel?: string; onConfirm: () => void; size?: "sm" | "md";
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  return (
    <Btn
      kind="danger" size={size}
      onClick={() => {
        if (timer.current !== null) clearTimeout(timer.current);
        if (armed) { setArmed(false); onConfirm(); return; }
        setArmed(true);
        timer.current = window.setTimeout(() => setArmed(false), 3000);
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? armedLabel : label}
    </Btn>
  );
}

// ── tooltips ──
/**
 * A focusable trigger with a bubble that is always in the accessibility tree (so `aria-describedby`
 * resolves) but only visible on hover or focus, and absolutely positioned so it shifts nothing.
 */
export function Tooltip({ text, children }: { text: string; children?: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="tip">
      <button
        type="button" className="tip__btn" aria-describedby={id} aria-label={children ? undefined : "what this does"}
        onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); } }}
      >
        {children ?? <i aria-hidden="true">?</i>}
      </button>
      <span role="tooltip" id={id} className={`tip__bub${open ? " is-on" : ""}`}>{text}</span>
    </span>
  );
}

// ── states ──
const THEME = { baseColor: "rgba(242,245,255,.05)", highlightColor: "rgba(242,245,255,.13)", borderRadius: 0, duration: 1.2 };
/**
 * One skeleton block per row, in the site's palette and its chamfered shape. Same call shape the shell
 * and the panels already use. One <RLSkeleton> per row rather than `count`, so the grid gap does the
 * spacing instead of the library's line breaks.
 */
export function Skeleton({ rows = 3, height = 58 }: { rows?: number; height?: number }) {
  return (
    <SkeletonTheme {...THEME}>
      <div className="adm__list">
        {Array.from({ length: rows }, (_, i) => <RLSkeleton key={i} height={height} className="bone" />)}
      </div>
    </SkeletonTheme>
  );
}
/** A single themed skeleton, for the odd shape a row of blocks does not fit. */
export function Bone({ height, width, circle }: { height?: number | string; width?: number | string; circle?: boolean }) {
  return <SkeletonTheme {...THEME}><RLSkeleton height={height} width={width} circle={circle} className="bone" /></SkeletonTheme>;
}
export function Empty({ text, icon = "◌", action, onAction }: { text: string; icon?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty">
      <i aria-hidden="true">{icon}</i>
      <p>{text}</p>
      {action && onAction && <Btn kind="primary" onClick={onAction}>{action}</Btn>}
    </div>
  );
}
export function Badge({ children, tone = "mute" }: { children: ReactNode; tone?: "mute" | "on" | "off" | "warn" | "hot" | "cool" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

// ── list furniture ──
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="tbar">{children}</div>;
}
/** Debounced search box: the input answers every keystroke, the panel hears the settled value. */
export function Search({ value, onChange, placeholder = "search…", delay = 200 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; delay?: number;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  const push = (v: string): void => {
    setDraft(v);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onChange(v), delay);
  };
  return (
    <div className="tbar__find">
      <i aria-hidden="true">⌕</i>
      <input
        type="search" value={draft} placeholder={placeholder} aria-label="search"
        onChange={(e) => push(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && draft) { e.stopPropagation(); push(""); } }}
      />
    </div>
  );
}
export function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button type="button" className={`chip${on ? " is-on" : ""}`} aria-pressed={on} onClick={onClick}>
      {children}{count !== undefined && <b>{count}</b>}
    </button>
  );
}
export function Count({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return <p className="tbar__count">{shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`}</p>;
}
export function Section({ title, tip, children, actions }: { title: string; tip?: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <>
      <div className="sect">
        <p className="panel__h">{title}{tip && <Tooltip text={tip} />}</p>
        {actions && <div className="sect__acts">{actions}</div>}
      </div>
      {children}
    </>
  );
}
/** The detail box: the chamfered card a selected row, or the create form, opens into. */
export function Card({ title, onClose, children, actions }: { title: string; onClose?: () => void; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="sf dbox">
      <div className="sf__in">
        <div className="dbox__top">
          <h3>{title}</h3>
          {actions}
          {onClose && <Btn onClick={onClose} aria-label="close the detail">close</Btn>}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── the modal ──

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A page-wide dialog. The scrim and Escape close it, Tab cycles inside it, the page behind it cannot
 * scroll, and the focus goes back to whatever opened it. Header and footer are pinned and only the body
 * scrolls, so a form of any length keeps its title and its save button on screen. Full screen on a phone.
 */
export function Modal({ title, subtitle, onClose, children, actions, foot, width }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Beside the title, in the pinned header. */
  actions?: ReactNode;
  /** The pinned footer: save, undo, delete. */
  foot?: ReactNode;
  /** Overrides the box's width; the default is nearly the whole viewport. */
  width?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  // Lock the page, take the focus, hand it back to the trigger on the way out.
  useEffect(() => {
    const from = document.activeElement;
    box.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (from instanceof HTMLElement) from.focus();
    };
  }, []);

  const trap = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab") return;
    const el = box.current;
    if (!el) return;
    const stops = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetWidth > 0 || n.offsetHeight > 0);
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    const at = document.activeElement;
    if (e.shiftKey && (at === first || at === el)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className="mdl" onKeyDown={trap}>
      {/* a button, so a pointer close is also a keyboard-reachable one for anything that ignores Escape */}
      <button type="button" className="mdl__scrim" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div
        className="sf mdl__box" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={box}
        style={width ? { width } : undefined}
      >
        <div className="sf__in">
          <div className="mdl__top">
            <h3 id={id}>{title}</h3>
            {subtitle && <p className="mdl__sub">{subtitle}</p>}
            <div className="mdl__acts">
              {actions}
              <Btn onClick={onClose} aria-label="close this editor">close</Btn>
            </div>
          </div>
          <div className="mdl__body">{children}</div>
          {foot && <div className="mdl__foot">{foot}</div>}
        </div>
      </div>
    </div>
  );
}

// ── table ──
export interface SortState { key: string; dir: "asc" | "desc" }
export interface Column<T> {
  key: string;
  label: string;
  cell: (row: T) => ReactNode;
  /** Supplying this makes the header sortable. */
  value?: (row: T) => string | number;
  num?: boolean;
  width?: string;
}
export function useSort(initial: SortState | null = null): { sort: SortState | null; toggle: (key: string) => void } {
  const [sort, setSort] = useState<SortState | null>(initial);
  return {
    sort,
    toggle: (key) => setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" })),
  };
}
/** Sorts a copy by the column's `value`, so the caller keeps its own filtered array untouched. */
export function applySort<T>(rows: readonly T[], columns: readonly Column<T>[], sort: SortState | null): T[] {
  const col = sort ? columns.find((c) => c.key === sort.key) : undefined;
  const get = col?.value;
  if (!sort || !get) return [...rows];
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b);
    if (typeof x === "number" && typeof y === "number") return (x - y) * sign;
    return String(x).localeCompare(String(y)) * sign;
  });
}

export function Table<T>({ columns, rows, keyOf, selected, onSelect, sort, onSort, label, actions }: {
  columns: readonly Column<T>[];
  rows: readonly T[];
  keyOf: (row: T) => string | number;
  selected?: string | number | null;
  onSelect?: (row: T) => void;
  sort?: SortState | null;
  onSort?: (key: string) => void;
  label: string;
  /** Rendered in the last cell of every row. */
  actions?: (row: T) => ReactNode;
}) {
  // Arrow keys walk the rows: move the selection and take the focus with it.
  const nav = (e: React.KeyboardEvent<HTMLTableRowElement>, i: number): void => {
    if (!onSelect) return;
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    const to = e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : step ? i + step : -1;
    if (to < 0 || to >= rows.length) {
      if (e.key === "Enter" || e.key === " ") { const row = rows[i]; if (row) { e.preventDefault(); onSelect(row); } }
      return;
    }
    e.preventDefault();
    const row = rows[to];
    if (!row) return;
    onSelect(row);
    const target = e.currentTarget.parentElement?.children[to];
    if (target instanceof HTMLElement) target.focus();
  };

  return (
    <div className="tw">
      <table className="tbl tbl--rows" aria-label={label}>
        <thead>
          <tr>
            {onSelect && <th className="tbl__pin" aria-label="selected" />}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th key={c.key} className={[c.num && "num", active && "is-sorted"].filter(Boolean).join(" ") || undefined} style={c.width ? { width: c.width } : undefined}
                  aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}>
                  {c.value && onSort
                    ? <button type="button" onClick={() => onSort(c.key)}>{c.label}<i aria-hidden="true">{active ? (sort?.dir === "asc" ? "↑" : "↓") : "↕"}</i></button>
                    : c.label}
                </th>
              );
            })}
            {actions && <th aria-label="actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const k = keyOf(row);
            const on = selected !== null && selected !== undefined && selected === k;
            return (
              <tr
                key={k} className={on ? "is-on" : undefined} aria-current={on ? "true" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={onSelect ? () => onSelect(row) : undefined}
                onKeyDown={onSelect ? (e) => nav(e, i) : undefined}
              >
                {onSelect && <td className="tbl__pin"><i aria-hidden="true">{on ? "▸" : "·"}</i></td>}
                {columns.map((c) => <td key={c.key} className={c.num ? "num" : undefined} data-label={c.label}>{c.cell(row)}</td>)}
                {actions && <td className="tbl__acts" onClick={(e) => e.stopPropagation()}>{actions(row)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── pagination ──
export interface PagerState { page: number; per: number; pages: number; from: number; to: number; setPage: (n: number) => void; setPer: (n: number) => void }
const PERS = [25, 50, 100] as const;

/** Page state that clamps itself: a filter shrinking the list must not leave the pager on a dead page. */
export function usePager(total: number, initialPer = 25): PagerState {
  const [wanted, setWanted] = useState(1);
  const [per, choosePer] = useState(initialPer);
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(Math.max(1, wanted), pages);
  return {
    page, per, pages,
    from: total === 0 ? 0 : (page - 1) * per + 1,
    to: Math.min(total, page * per),
    setPage: (n) => setWanted(Math.min(Math.max(1, n), pages)),
    setPer: (n) => { choosePer(n); setWanted(1); },
  };
}
export const pageOf = <T,>(rows: readonly T[], s: PagerState): T[] => rows.slice((s.page - 1) * s.per, (s.page - 1) * s.per + s.per);

export function Pager({ state, total, noun = "rows" }: { state: PagerState; total: number; noun?: string }) {
  const { page, pages, per, from, to, setPage, setPer } = state;
  return (
    <div className="pager">
      <p>{total === 0 ? `no ${noun}` : `${from}–${to} of ${total} ${noun}`}</p>
      <div className="pager__go">
        <Btn onClick={() => setPage(1)} disabled={page <= 1} aria-label="first page">«</Btn>
        <Btn onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="previous page">‹</Btn>
        <span>{page} / {pages}</span>
        <Btn onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="next page">›</Btn>
        <Btn onClick={() => setPage(pages)} disabled={page >= pages} aria-label="last page">»</Btn>
      </div>
      <label className="pager__per">
        per page
        <select value={per} onChange={(e) => setPer(Number(e.target.value))} aria-label="rows per page">
          {PERS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </div>
  );
}

/** Lower-cased haystack search over the fields a panel names, memoised on the term. */
export function useSearch<T>(rows: readonly T[], term: string, fields: (row: T) => readonly (string | number | null | undefined)[]): T[] {
  const q = term.trim().toLowerCase();
  return useMemo(() => {
    if (!q) return [...rows];
    return rows.filter((r) => fields(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)));
    // `fields` is written inline at every call site, so it is a new function every render; the term and
    // the rows are what actually change the answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q]);
}

// ── controls the scene panel needed, kept here so every panel can have them ──

/** A labelled point on a log slider: the value, and what to call it. */
export interface Stop { at: number; label: string }
/** Two decimals while small, one while mid-sized, whole numbers once the value is large. */
const tidy = (v: number): number => (v < 10 ? Math.round(v * 100) / 100 : v < 1000 ? Math.round(v * 10) / 10 : Math.round(v));

/**
 * A range whose travel is logarithmic. A linear slider from 0.2 au to a light year spends 99% of its
 * track on the last 1% of the values, so the track carries `log(value/min)` instead and the stops give
 * the reachable landmarks a click of their own.
 */
export function LogSlider({ label, value, onChange, min, max, stops = [], tip, format }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
  stops?: readonly Stop[]; tip?: string; format?: (v: number) => string;
}) {
  const span = Math.log(max / min);
  const at = Math.min(max, Math.max(min, value));
  const pos = Math.round((Math.log(at / min) / span) * 1000);
  const shown = format ? format(at) : String(tidy(at));
  return (
    <div className="fld sld sld--log">
      <label>{label}{tip && <Tooltip text={tip} />}</label>
      <b className="sld__v">{shown}</b>
      <input
        type="range" min={0} max={1000} step={1} value={pos} aria-label={label} aria-valuetext={shown}
        onChange={(e) => onChange(tidy(min * Math.exp((Number(e.target.value) / 1000) * span)))}
      />
      {stops.length > 0 && (
        <div className="sld__stops">
          {stops.map((s) => (
            <button key={s.label} type="button" className={`stop${Math.abs(s.at - at) <= s.at * 0.02 ? " is-on" : ""}`} onClick={() => onChange(s.at)}>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ChoiceOption<T extends string> { value: T; label: string; note?: string }
/** Radio cards: for a choice of three where each option needs a sentence, not a dropdown row. */
export function Choice<T extends string>({ name, value, onChange, options }: {
  name: string; value: T; onChange: (v: T) => void; options: readonly ChoiceOption<T>[];
}) {
  return (
    <div className="choice">
      {options.map((o) => (
        <label key={o.value} className={`choice__opt${value === o.value ? " is-on" : ""}`}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <b>{o.label}</b>
          {o.note && <small>{o.note}</small>}
        </label>
      ))}
    </div>
  );
}

export interface RampStop { label: string; value: number; onChange: (v: number) => void }
/** Colour stops edited together, under the gradient they actually make. */
export function ColourRamp({ label, stops, tip }: { label: string; stops: readonly RampStop[]; tip?: string }) {
  const hex = (v: number): string => `#${(v >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
  return (
    <div className="ramp">
      <p className="ramp__h">{label}{tip && <Tooltip text={tip} />}</p>
      <div className="ramp__bar" aria-hidden="true" style={{ background: `linear-gradient(90deg, ${stops.map((s) => hex(s.value)).join(", ")})` }} />
      <div className="ramp__stops">
        {stops.map((s) => <Field key={s.label} label={s.label}><Colour value={s.value} onChange={s.onChange} /></Field>)}
      </div>
    </div>
  );
}

/** A checkbox that can explain itself — `Check` plus the tooltip a live-value switch needs. */
export function Toggle({ label, checked, onChange, tip }: { label: string; checked: boolean; onChange: (v: boolean) => void; tip?: string }) {
  const id = useId();
  return (
    <div className="fld fld--row">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
      {tip && <Tooltip text={tip} />}
    </div>
  );
}

/** The value the live source holds for the field beside it, and whether that side is currently winning. */
export function LiveNote({ on, value, tip }: { on: boolean; value: string; tip?: string }) {
  if (!value) return null;
  return (
    <p className={`live${on ? " is-on" : ""}`}>
      <i aria-hidden="true">{on ? "▸" : "·"}</i>
      <em>{on ? "github wins" : "github ignored"}</em>
      <span>{value}</span>
      {tip && <Tooltip text={tip} />}
    </p>
  );
}

// ── the account's repositories ──

export interface AdminRepo {
  name: string;
  fullName: string;
  description: string;
  homepage: string;
  language: string;
  topics: readonly string[];
  stars: number;
  /** ISO date of the last push, or "" when the source did not say. */
  pushedAt: string;
  url: string;
  private: boolean;
  archived: boolean;
  fork: boolean;
  /** The project already pointed at this repository, when the endpoint says so. */
  linkedTo: string;
}

const pick = (o: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const k of keys) { const v = o[k]; if (v !== undefined && v !== null) return v; }
  return undefined;
};
const asText = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const asCount = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** The endpoint is another agent's; read it by shape rather than by trust, and skip whatever has no name. */
function toRepo(v: unknown): AdminRepo | null {
  if (typeof v !== "object" || v === null) return null;
  const o: Record<string, unknown> = { ...v };
  const full = asText(pick(o, ["fullName", "full_name", "nameWithOwner"]));
  const name = asText(pick(o, ["name", "repo"])) || full.split("/").pop() || "";
  if (!name) return null;
  return {
    name,
    fullName: full || name,
    description: asText(pick(o, ["description", "desc"])),
    homepage: asText(pick(o, ["homepage", "live"])),
    language: asText(pick(o, ["language", "mainLanguage", "primaryLanguage"])),
    topics: asList(pick(o, ["topics", "tags"])),
    stars: asCount(pick(o, ["stars", "stargazers_count", "stargazersCount"])),
    pushedAt: asText(pick(o, ["pushedAt", "pushed", "pushed_at", "updatedAt", "updated_at"])),
    url: asText(pick(o, ["url", "htmlUrl", "html_url"])),
    private: pick(o, ["private", "isPrivate"]) === true,
    archived: pick(o, ["archived", "isArchived"]) === true,
    fork: pick(o, ["fork", "isFork"]) === true,
    linkedTo: asText(pick(o, ["linkedTo", "linked", "projectSlug", "project"])),
  };
}

/**
 * The account's repositories. The route may not exist yet, so a miss is a message rather than a throw
 * and every panel that uses this must still render with an empty list.
 */
export function useRepos(): { repos: AdminRepo[]; loading: boolean; error: string; refresh: () => Promise<void> } {
  const [repos, setRepos] = useState<AdminRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const res = await call("/api/admin/github/repos");
    if (!res.ok) {
      setRepos([]);
      setError(/40[34]/.test(res.error ?? "") ? "the repository list is not available yet" : res.error ?? "could not load the repositories");
      setLoading(false);
      return;
    }
    const raw = Array.isArray(res.data)
      ? res.data
      : typeof res.data === "object" && res.data !== null && "repos" in res.data && Array.isArray((res.data as { repos: unknown }).repos)
        ? (res.data as { repos: unknown[] }).repos
        : [];
    setRepos(raw.map(toRepo).filter((r): r is AdminRepo => r !== null));
    setError("");
    setLoading(false);
  }, []);

  // The writes land after the fetch resolves, not while the effect runs — see the note in useResource.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);
  return { repos, loading, error, refresh };
}

/**
 * The sun's radius from the scene row, and nothing else — the projects panel needs it to cap a planet's
 * size without owning the scene form. A miss leaves the column's own default of 6 in place, so the
 * editor still works when the scene endpoint is unreachable.
 */
export function useSunRadius(): { sunRadius: number; loading: boolean } {
  const [sunRadius, setSun] = useState(6);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const res = await call("/api/admin/scene");
    const row: unknown = Array.isArray(res.data) ? res.data[0] : res.data;
    if (res.ok && typeof row === "object" && row !== null && "sunRadius" in row) {
      const v = (row as { sunRadius: unknown }).sunRadius;
      if (typeof v === "number" && Number.isFinite(v) && v > 0) setSun(v);
    }
    setLoading(false);
  }, []);
  // The writes land after the fetch resolves — see the note in useResource.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);
  return { sunRadius, loading };
}

// ── remembered ui state ──

const FOLD_KEY = "adm.fold.";
const foldSubs = new Set<() => void>();
/** Reads the primitive straight out of storage: a boolean compares by value, so no snapshot cache. */
function readFold(id: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(FOLD_KEY + id);
    return raw === "1" ? true : raw === "0" ? false : fallback;
  } catch { return fallback; }   // private mode, or storage switched off
}
const subFold = (fn: () => void): (() => void) => { foldSubs.add(fn); return () => { foldSubs.delete(fn); }; };

/**
 * A remembered open/shut flag. Storage is read through `useSyncExternalStore` rather than in an effect,
 * so the value is right on the first client paint and nothing sets state while an effect runs.
 */
export function useFold(id: string, initial = true): [boolean, (v: boolean) => void] {
  const open = useSyncExternalStore(subFold, () => readFold(id, initial), () => initial);
  const set = useCallback((v: boolean) => {
    try { localStorage.setItem(FOLD_KEY + id, v ? "1" : "0"); } catch { /* cosmetic only */ }
    for (const fn of foldSubs) fn();
  }, [id]);
  return [open, set];
}

/**
 * `Section` that folds, and remembers whether it was folded. Give the least-used blocks `open={false}`
 * and a form of a hundred controls opens as a page of headings.
 */
export function Fold({ id, title, tip, note, actions, children, open: initial = true }: {
  /** The storage key. Stable per section, not per row. */
  id: string;
  title: string;
  tip?: string;
  /** A word or two about what is inside, shown while it is shut. */
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = useFold(id, initial);
  const bodyId = useId();
  return (
    <section className={`fold${open ? " is-on" : ""}`}>
      <div className="fold__top">
        <button type="button" className="fold__t" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          <i aria-hidden="true">{open ? "▾" : "▸"}</i>{title}
        </button>
        {tip && <Tooltip text={tip} />}
        {note && !open && <span className="fold__note">{note}</span>}
        {actions && <div className="fold__acts">{actions}</div>}
      </div>
      <div id={bodyId} className="fold__body" hidden={!open}>{children}</div>
    </section>
  );
}

/** Label on the left, control on the right, one line — `Field` for the knobs that do not need a column. */
export function Row({ label, hint, tip, children }: { label: string; hint?: string; tip?: string; children: ReactNode }) {
  return (
    <div className="fld rw">
      <label>{label}{hint && <small>{hint}</small>}{tip && <Tooltip text={tip} />}</label>
      <div className="rw__in">{children}</div>
    </div>
  );
}

/** Colour stops as a row of swatches, each captioned — the dense form of four `Field`s of `Colour`. */
export function Swatches({ items }: { items: readonly RampStop[] }) {
  return (
    <div className="swatches">
      {items.map((s) => (
        <label key={s.label} className="swatch">
          <Colour value={s.value} onChange={s.onChange} />
          <span>{s.label}</span>
        </label>
      ))}
    </div>
  );
}

// ── moons ──

export const MOON_TYPES = ["rocky", "ice", "muddy", "liquid", "lava"] as const;
export type MoonType = (typeof MOON_TYPES)[number];
/** The stored shape of one moon — `MoonConfigJson` in src/db/schema.ts, mirrored for the client. */
export interface Moon {
  name: string;
  /** The repository folder it came from; empty when it was added by hand. */
  path: string;
  size: number; orbit: number; speed: number; tilt: number; phase: number;
  colour: number;
  type: MoonType;
  /** True while it is still exactly what detection produced; any edit clears it. */
  auto: boolean;
  visible: boolean;
}
/** How many moons one planet may carry, in the admin and in the scene both. */
export const MOON_CAP = 6;
export const MOON_CAP_TIP = `six is the cap: past that the labels collide and the moons hide the planet they orbit. Detection keeps the ${MOON_CAP} biggest folders and drops the rest.`;

const MOON_DEFAULTS: Omit<Moon, "name" | "path"> = { size: 0.26, orbit: 2.2, speed: 6, tilt: 8, phase: 0, colour: 0x9fb4c7, type: "rocky", auto: false, visible: true };
const asType = (v: unknown): MoonType => (typeof v === "string" && (MOON_TYPES as readonly string[]).includes(v) ? (v as MoonType) : "rocky");

/** A moon the way the endpoint or the row happens to spell it; anything unreadable is dropped. */
export function toMoon(v: unknown): Moon | null {
  if (typeof v === "string") return v.trim() ? { ...MOON_DEFAULTS, name: v.trim(), path: v.trim(), auto: true } : null;
  if (typeof v !== "object" || v === null) return null;
  const o: Record<string, unknown> = { ...v };
  const path = asText(pick(o, ["path", "folder", "dir", "directory"]));
  const name = asText(pick(o, ["name", "label", "title"])) || path.split("/").filter(Boolean).pop() || "";
  if (!name) return null;
  const num = (keys: readonly string[], fallback: number): number => {
    const raw = pick(o, keys);
    return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
  };
  return {
    name, path,
    size: num(["size", "radius"], MOON_DEFAULTS.size),
    orbit: num(["orbit", "distance"], MOON_DEFAULTS.orbit),
    speed: num(["speed", "spin", "rate"], MOON_DEFAULTS.speed),
    tilt: num(["tilt", "inclination"], MOON_DEFAULTS.tilt),
    phase: num(["phase", "offset"], MOON_DEFAULTS.phase),
    colour: num(["colour", "color", "c0"], MOON_DEFAULTS.colour),
    type: asType(pick(o, ["type", "surface"])),
    auto: pick(o, ["auto", "detected"]) !== false,
    visible: pick(o, ["visible", "shown"]) !== false,
  };
}
/** The row's `moons` column, read by shape — the API may not be sending it yet. */
export const readMoons = (v: unknown): Moon[] => (Array.isArray(v) ? v.map(toMoon).filter((m): m is Moon => m !== null) : []);
/** A hand-made moon, named after nothing in the repository. */
export const newMoon = (n: number): Moon => ({ ...MOON_DEFAULTS, name: `moon ${n}`, path: "", phase: (n * 60) % 360, orbit: 2.2 + n * 0.5, auto: false });

export interface MoonTree {
  /** Every top-level folder the repository has, whether or not it became a moon. */
  folders: string[];
  /** What detection would write. */
  moons: Moon[];
  error: string;
}
/**
 * What the repository's top level would produce. Another agent owns the route, so a 404 is a sentence
 * rather than a throw and the caller still renders.
 */
export async function detectMoons(slug: string): Promise<MoonTree> {
  const res = await call(`/api/admin/github/tree?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) {
    return { folders: [], moons: [], error: /40[34]/.test(res.error ?? "") ? "the repository tree endpoint is not there yet — nothing was detected" : res.error ?? "could not read the repository" };
  }
  const o: Record<string, unknown> = typeof res.data === "object" && res.data !== null ? { ...res.data } : {};
  const moons = readMoons(Array.isArray(res.data) ? res.data : pick(o, ["moons", "detected", "bodies"]));
  const rawFolders = pick(o, ["folders", "dirs", "directories", "tree", "paths"]);
  const folders = Array.isArray(rawFolders)
    ? rawFolders.map((f) => (typeof f === "string" ? f : typeof f === "object" && f !== null ? asText(pick({ ...f }, ["path", "name", "folder"])) : "")).filter((f) => f !== "")
    : moons.map((m) => m.path || m.name);
  return { folders, moons, error: moons.length === 0 && folders.length === 0 ? "no top-level folders worth a moon in that repository" : "" };
}

/**
 * Detects and writes, server-side. `all` does every project, `slug` does one, `replace` drops the moons
 * detection no longer finds; a moon whose `auto` is false is never touched either way. The reply is
 * summarised for a toast, because the counts are what the owner actually wants to read.
 */
export async function writeMoons(body: { slug?: string; all?: boolean; replace?: boolean }): Promise<{ ok: boolean; text: string }> {
  const res = await call("/api/admin/projects/moons", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) {
    return { ok: false, text: /40[34]/.test(res.error ?? "") ? "the moon detection endpoint is not there yet — nothing was written" : res.error ?? "could not detect the moons" };
  }
  const o: Record<string, unknown> = typeof res.data === "object" && res.data !== null && !Array.isArray(res.data) ? { ...res.data } : {};
  const per = Array.isArray(res.data) ? res.data : Array.isArray(o["projects"]) ? o["projects"] : [];
  const tally = (keys: readonly string[]): number | null => {
    const top = pick(o, keys);
    if (typeof top === "number") return top;
    if (Array.isArray(top)) return top.length;
    if (per.length === 0) return null;
    let sum = 0;
    let seen = false;
    for (const p of per) {
      if (typeof p !== "object" || p === null) continue;
      const v = pick({ ...p }, keys);
      if (typeof v === "number") { sum += v; seen = true; }
      else if (Array.isArray(v)) { sum += v.length; seen = true; }
    }
    return seen ? sum : null;
  };
  const parts = ([["added", ["added", "created"]], ["kept", ["kept", "unchanged"]], ["removed", ["removed", "deleted"]]] as const)
    .map(([label, keys]) => { const n = tally(keys); return n === null ? null : `${n} ${label}`; })
    .filter((s): s is string => s !== null);
  const where = body.all ? `${per.length || "every"} project${per.length === 1 ? "" : "s"}` : body.slug ?? "the project";
  return { ok: true, text: parts.length ? `${where}: ${parts.join(" · ")}` : `${where}: detection ran` };
}

/**
 * One moon, editable on one line: name, folder, the five numbers, its surface, its colour and whether
 * the scene draws it. Every change clears `auto`, so the next detection leaves this moon alone — which
 * is the whole contract between "auto detected" and "flexible to set manually".
 */
export function MoonRow({ moon, onChange, onRemove }: { moon: Moon; onChange: (m: Moon) => void; onRemove: () => void }) {
  const set = <K extends keyof Moon>(k: K, v: Moon[K]): void => onChange({ ...moon, [k]: v, auto: false });
  return (
    <div className={`moon${moon.visible ? "" : " is-off"}`}>
      <div className="moon__id">
        <input
          type="text" value={moon.name} aria-label="moon name" placeholder="name"
          onChange={(e) => set("name", e.target.value)}
        />
        <small title={moon.path || "added by hand"}>{moon.path || "by hand"}</small>
      </div>
      <label className="moon__n"><span>size</span><input type="number" step={0.02} min={0.02} value={moon.size} onChange={(e) => set("size", Number(e.target.value))} /></label>
      <label className="moon__n"><span>orbit</span><input type="number" step={0.1} min={0.2} value={moon.orbit} onChange={(e) => set("orbit", Number(e.target.value))} /></label>
      <label className="moon__n"><span>speed</span><input type="number" step={0.5} value={moon.speed} onChange={(e) => set("speed", Number(e.target.value))} /></label>
      <label className="moon__n"><span>tilt</span><input type="number" step={1} value={moon.tilt} onChange={(e) => set("tilt", Number(e.target.value))} /></label>
      <label className="moon__n"><span>phase</span><input type="number" step={5} value={moon.phase} onChange={(e) => set("phase", Number(e.target.value))} /></label>
      <label className="moon__n moon__n--wide">
        <span>type</span>
        <select value={moon.type} onChange={(e) => set("type", asType(e.target.value))}>
          {MOON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="moon__c"><span className="vh">colour</span><Colour value={moon.colour} onChange={(v) => set("colour", v)} /></label>
      <span className="moon__tag">{moon.auto ? <Badge tone="cool">auto</Badge> : <Badge tone="warn">edited</Badge>}</span>
      <label className="moon__see">
        <input type="checkbox" checked={moon.visible} onChange={(e) => set("visible", e.target.checked)} />
        <span>show</span>
      </label>
      <Btn onClick={onRemove} aria-label={`remove ${moon.name}`}>×</Btn>
    </div>
  );
}
