"use client";
// A very small stale-while-revalidate cache for the admin's own fetches.
//
// Why it exists: every panel used to fetch on mount, so switching tabs re-downloaded data that had not
// changed and the screen flashed a skeleton each time. Now the first answer is kept, shown instantly on
// the next mount, and refreshed in the background when it is older than `staleMs`. One in-flight
// request per key, so two panels asking at once share the answer.
//
// The cache is the external store and React subscribes to it, which is why there is no useState here:
// a component never has to copy the data into its own state, so nothing cascades.

import { useCallback, useEffect, useSyncExternalStore } from "react";

interface Entry<T> { data: T | undefined; at: number; refreshing: boolean; error: string | null }

const EMPTY: Entry<never> = { data: undefined, at: 0, refreshing: false, error: null };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const watchers = new Map<string, Set<() => void>>();

const DEFAULT_STALE = 30_000;

function read<T>(key: string): Entry<T> {
  const hit = store.get(key);
  return hit === undefined ? (EMPTY as Entry<T>) : (hit as Entry<T>);
}
function write<T>(key: string, patch: Partial<Entry<T>>): void {
  store.set(key, { ...read<T>(key), ...patch });
  for (const fn of watchers.get(key) ?? []) fn();
}

/** Drops one key, or every key under the prefix, and wakes anything watching them. */
export function invalidate(prefix: string): void {
  for (const key of [...store.keys()]) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      store.delete(key);
      for (const fn of watchers.get(key) ?? []) fn();
    }
  }
}

async function fetchJson<T>(key: string, url: string): Promise<void> {
  const pending = inflight.get(key);
  if (pending) { await pending; return; }
  write<T>(key, { refreshing: true });
  const task = (async (): Promise<T> => {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  })();
  inflight.set(key, task);
  try {
    const data = await task;
    write<T>(key, { data, at: Date.now(), refreshing: false, error: null });
  } catch (e) {
    write<T>(key, { refreshing: false, error: e instanceof Error ? e.message : "request failed" });
  } finally {
    inflight.delete(key);
  }
}

export interface Cached<T> {
  data: T | undefined;
  /** True only while there is nothing to show; a background refresh sets `refreshing` instead. */
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** JSON GET with the cache in front of it. `key` is the cache key, not necessarily the URL. */
export function useCached<T>(key: string, url: string, staleMs = DEFAULT_STALE): Cached<T> {
  const subscribe = useCallback((fn: () => void) => {
    const set = watchers.get(key) ?? new Set<() => void>();
    set.add(fn);
    watchers.set(key, set);
    return () => { set.delete(fn); if (!set.size) watchers.delete(key); };
  }, [key]);

  const entry = useSyncExternalStore(subscribe, () => read<T>(key), () => EMPTY as Entry<T>);
  const reload = useCallback(() => fetchJson<T>(key, url), [key, url]);

  useEffect(() => {
    const check = (): void => {
      if (document.hidden) return;
      const now = read<T>(key);
      // nothing cached, or what is cached is old enough to be worth a background refresh
      if (now.data === undefined || Date.now() - now.at > staleMs) void fetchJson<T>(key, url);
    };
    check();
    // a tab left open across days must keep noticing, not just show whatever it fetched at mount
    const id = window.setInterval(check, staleMs);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [key, url, staleMs]);

  return {
    data: entry.data,
    loading: entry.data === undefined && entry.error === null,
    refreshing: entry.refreshing,
    error: entry.error,
    reload,
  };
}
