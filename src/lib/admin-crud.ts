// The admin write layer. Every /api/admin/<resource> route is the same six moves — check the session,
// read the body, validate it, hit one table, drop the content cache, answer — so they are described
// here once and each route is left with only what is actually specific to it: its table and its rules.
//
// Validation is hand written. `fields()` reads an unknown JSON body one key at a time, throwing a
// FieldError with a message a human can act on; `build()` turns that throw into a 400. A validator is
// handed the row already in the database, so a PUT carrying two keys is a merge onto the stored row
// rather than a half-empty insert — which is also why the values it returns are always a complete,
// typed insert model and the queries below need no casts.

import { and, asc, desc, eq, getTableColumns, inArray, ne, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { getDb, type Db } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { revalidateContent } from "@/lib/content";

// ── responses ───────────────────────────────────────────

export const ok = (body: unknown, status = 200): Response => Response.json(body, { status });
export const bad = (error: string, status: number): Response => Response.json({ error }, { status });

/** Never leak an exception to the client: log it with the resource that raised it, answer briefly. */
function crash(where: string, e: unknown): Response {
  console.error(`[admin] ${where}`, e instanceof Error ? e.message : e);
  if (isUniqueViolation(e)) return bad("That value is already taken", 409);
  return bad("Request failed", 500);
}

/** Postgres unique-violation, in case two saves race past the pre-flight check. */
function isUniqueViolation(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const code: unknown = Reflect.get(e, "code");
  return code === "23505";
}

/** The guard, the database handle and the try/catch that every handler needs. */
async function guarded(where: string, run: (db: Db) => Promise<Response>): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);
  try {
    return await run(db);
  } catch (e) {
    return crash(where, e);
  }
}

// ── reading an unknown body ─────────────────────────────

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Body or null — a malformed payload is a 400, not a 500. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

/** Accepts a JSON number or a numeric string, because query strings only carry strings. */
export function readId(v: unknown): number | null {
  if (typeof v === "number") return Number.isInteger(v) && v > 0 ? v : null;
  if (typeof v === "string" && /^\d{1,10}$/.test(v)) return Number(v) || null;
  return null;
}

export class FieldError extends Error {}
/** Reject the current value with a message the admin UI can show verbatim. */
export function reject(message: string): never {
  throw new FieldError(message);
}

export interface Range {
  min?: number;
  max?: number;
}
export interface ListOpts {
  /** How many entries are allowed. */
  count?: number;
  /** How long each entry may be. */
  length?: number;
}

/** One reader per shape. `fallback === undefined` means the field is required. */
export interface Fields {
  has(key: string): boolean;
  /** Non-empty, trimmed text. */
  text(key: string, fallback: string | undefined, max?: number): string;
  /** Trimmed text that may be empty — the columns that default to "". */
  optText(key: string, fallback: string | undefined, max?: number): string;
  /** /^[a-z0-9-]{2,64}$/ — the shape a URL segment is allowed to take. */
  slug(key: string, fallback: string | undefined): string;
  int(key: string, fallback: number | undefined, range?: Range): number;
  num(key: string, fallback: number | undefined, range?: Range): number;
  /** An 0xRRGGBB integer, as the shaders store colours. */
  colour(key: string, fallback: number | undefined): number;
  bool(key: string, fallback: boolean | undefined): boolean;
  nullInt(key: string, fallback: number | null | undefined, range?: Range): number | null;
  list(key: string, fallback: readonly string[] | undefined, opts?: ListOpts): string[];
  /** Anything else: supply the reader, which may call reject(). */
  of<V>(key: string, fallback: V | undefined, read: (value: unknown, key: string) => V): V;
}

const MISSING = (key: string): never => reject(`${key} is required`);

function makeFields(raw: Record<string, unknown>): Fields {
  const pick = <V>(key: string, fallback: V | undefined, read: (value: unknown, key: string) => V): V => {
    if (!(key in raw) || raw[key] === undefined) return fallback === undefined ? MISSING(key) : fallback;
    return read(raw[key], key);
  };
  const asText = (max: number, allowEmpty: boolean) => (value: unknown, key: string): string => {
    if (typeof value !== "string") reject(`${key} must be text`);
    const trimmed = value.trim();
    if (!allowEmpty && trimmed === "") reject(`${key} cannot be empty`);
    if (trimmed.length > max) reject(`${key} is longer than ${max} characters`);
    return trimmed;
  };
  const asNumber = (range: Range, whole: boolean) => (value: unknown, key: string): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) reject(`${key} must be a number`);
    if (whole && !Number.isInteger(value)) reject(`${key} must be a whole number`);
    if (range.min !== undefined && value < range.min) reject(`${key} must be at least ${range.min}`);
    if (range.max !== undefined && value > range.max) reject(`${key} must be at most ${range.max}`);
    return value;
  };
  return {
    has: (key) => key in raw && raw[key] !== undefined,
    text: (key, fallback, max = 400) => pick(key, fallback, asText(max, false)),
    optText: (key, fallback, max = 400) => pick(key, fallback, asText(max, true)),
    slug: (key, fallback) =>
      pick(key, fallback, (value, k) => {
        const s = asText(64, false)(value, k);
        if (!/^[a-z0-9-]{2,64}$/.test(s)) reject(`${k} must be 2–64 characters of a–z, 0–9 or dashes`);
        return s;
      }),
    int: (key, fallback, range = {}) => pick(key, fallback, asNumber(range, true)),
    num: (key, fallback, range = {}) => pick(key, fallback, asNumber(range, false)),
    colour: (key, fallback) => pick(key, fallback, asNumber({ min: 0, max: 0xffffff }, true)),
    bool: (key, fallback) =>
      pick(key, fallback, (value, k) => {
        if (typeof value !== "boolean") reject(`${k} must be true or false`);
        return value;
      }),
    nullInt: (key, fallback, range = {}) =>
      pick(key, fallback, (value, k) => (value === null ? null : asNumber(range, true)(value, k))),
    list: (key, fallback, opts = {}) =>
      pick(key, fallback === undefined ? undefined : [...fallback], (value, k) => {
        if (!Array.isArray(value)) reject(`${k} must be a list`);
        if (value.length > (opts.count ?? 60)) reject(`${k} has more than ${opts.count ?? 60} entries`);
        return value.map((entry: unknown, i) => asText(opts.length ?? 400, false)(entry, `${k}[${i}]`));
      }),
    of: (key, fallback, read) => pick(key, fallback, read),
  };
}

export type Parsed<T> = { readonly error: string } | { readonly values: T };

/** Runs a validator over an unknown body, turning any reject() into an error message. */
export function build<T>(input: unknown, fn: (f: Fields) => T): Parsed<T> {
  if (!isRecord(input)) return { error: "Expected a JSON object" };
  try {
    return { values: fn(makeFields(input)) };
  } catch (e) {
    if (e instanceof FieldError) return { error: e.message };
    throw e;
  }
}

// ── the factory ─────────────────────────────────────────

export type Insert<T extends PgTable> = T["$inferInsert"];
export type Row<T extends PgTable> = T["$inferSelect"];
/** `existing` is the stored row on a PUT and null on a POST, so a validator can merge onto it. */
export type Parse<T extends PgTable> = (input: unknown, existing: Row<T> | null) => Parsed<Insert<T>>;

export interface CrudConfig<T extends PgTable> {
  /** Used in log lines and in "not found" messages. */
  name: string;
  table: T;
  id: PgColumn;
  order: PgColumn;
  newestFirst?: boolean;
  parse: Parse<T>;
  /** Enables PUT { reorder: [{ id, sortOrder }] }. */
  sort?: PgColumn;
  /** Checked before a write so a clash is a 409 with a useful message rather than a 500. */
  unique?: { column: PgColumn; label: string; value: (row: Insert<T>) => string };
  /** Whether a write should drop the public content cache. Defaults to true. */
  revalidate?: boolean;
}

export interface CrudHandlers {
  GET: () => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
  PUT: (request: Request) => Promise<Response>;
  DELETE: (request: Request) => Promise<Response>;
}

const MAX_REORDER = 500;

/** Drizzle needs a table it can prove is not a subquery to infer a selection; a widened local does it. */
const selectable = (table: PgTable): PgTable => table;
/** Insert and update return a conditional type drizzle cannot resolve generically; only JSON needs it. */
const firstRow = (rows: unknown): unknown => (Array.isArray(rows) ? (rows[0] ?? null) : null);

export function createCrud<T extends PgTable>(cfg: CrudConfig<T>): CrudHandlers {
  const cols = getTableColumns(cfg.table);
  const base = selectable(cfg.table);
  const revalidate = cfg.revalidate ?? true;
  const after = (): void => {
    if (revalidate) revalidateContent();
  };

  const find = async (db: Db, id: number): Promise<Row<T> | null> => {
    const rows: Row<T>[] = await db.select(cols).from(base).where(eq(cfg.id, id));
    return rows[0] ?? null;
  };

  /** Pre-flight uniqueness, ignoring the row being edited. */
  const taken = async (db: Db, values: Insert<T>, exceptId: number | null): Promise<string | null> => {
    const u = cfg.unique;
    if (!u) return null;
    const value = u.value(values);
    const where = exceptId === null ? eq(u.column, value) : and(eq(u.column, value), ne(cfg.id, exceptId));
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(base).where(where);
    return (row?.n ?? 0) > 0 ? `That ${u.label} is already taken` : null;
  };

  const reorder = async (db: Db, input: unknown): Promise<Response> => {
    const sortColumn = cfg.sort;
    if (!sortColumn) return bad(`${cfg.name} cannot be reordered`, 400);
    if (!Array.isArray(input) || input.length === 0) return bad("reorder must be a non-empty list", 400);
    if (input.length > MAX_REORDER) return bad(`reorder accepts at most ${MAX_REORDER} entries`, 400);

    const pairs: { id: number; sortOrder: number }[] = [];
    for (const entry of input) {
      if (!isRecord(entry)) return bad("each reorder entry must be an object", 400);
      const id = readId(entry.id);
      const sortOrder = entry.sortOrder;
      if (id === null) return bad("each reorder entry needs a numeric id", 400);
      if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder)) return bad("each reorder entry needs a whole sortOrder", 400);
      pairs.push({ id, sortOrder });
    }
    // One statement, not one per row: a CASE over the ids the caller sent.
    const cases = pairs.map((p) => sql`when ${p.id}::int then ${p.sortOrder}::int`);
    const column = sql.identifier(sortColumn.name);
    await db.execute(
      sql`update ${cfg.table} set ${column} = case ${cfg.id} ${sql.join(cases, sql` `)} else ${column} end where ${inArray(cfg.id, pairs.map((p) => p.id))}`,
    );
    after();
    return ok({ success: true, updated: pairs.length });
  };

  return {
    GET: () =>
      guarded(`${cfg.name} GET`, async (db) => {
        const rows: Row<T>[] = await db.select(cols).from(base).orderBy(cfg.newestFirst ? desc(cfg.order) : asc(cfg.order));
        return ok(rows);
      }),

    POST: (request) =>
      guarded(`${cfg.name} POST`, async (db) => {
        const body = await readBody(request);
        if (!body) return bad("Invalid JSON body", 400);
        const parsed = cfg.parse(body, null);
        if (!("values" in parsed)) return bad(parsed.error, 400);
        const clash = await taken(db, parsed.values, null);
        if (clash) return bad(clash, 409);
        const inserted = await db.insert(cfg.table).values(parsed.values).returning(cols);
        after();
        return ok(firstRow(inserted), 201);
      }),

    PUT: (request) =>
      guarded(`${cfg.name} PUT`, async (db) => {
        const body = await readBody(request);
        if (!body) return bad("Invalid JSON body", 400);
        if (body.reorder !== undefined) return reorder(db, body.reorder);

        const id = readId(body.id);
        if (id === null) return bad("A numeric id is required", 400);
        const existing = await find(db, id);
        if (!existing) return bad(`No such ${cfg.name}`, 404);
        const parsed = cfg.parse(body, existing);
        if (!("values" in parsed)) return bad(parsed.error, 400);
        const clash = await taken(db, parsed.values, id);
        if (clash) return bad(clash, 409);
        const updated = await db.update(cfg.table).set(parsed.values).where(eq(cfg.id, id)).returning(cols);
        after();
        return ok(firstRow(updated));
      }),

    DELETE: (request) =>
      guarded(`${cfg.name} DELETE`, async (db) => {
        const id = readId(new URL(request.url).searchParams.get("id"));
        if (id === null) return bad("A numeric id is required", 400);
        const gone = await db.delete(cfg.table).where(eq(cfg.id, id)).returning(cols);
        if (firstRow(gone) === null) return bad(`No such ${cfg.name}`, 404);
        after();
        return ok({ success: true });
      }),
  };
}

// ── single-row tables ───────────────────────────────────

export interface SingletonConfig<T extends PgTable> {
  name: string;
  table: T;
  parse: Parse<T>;
  revalidate?: boolean;
}
export interface SingletonHandlers {
  GET: () => Promise<Response>;
  PUT: (request: Request) => Promise<Response>;
}

/** profile and scene_config hold exactly one row: GET reads it, PUT edits it and creates it if absent. */
export function createSingleton<T extends PgTable>(cfg: SingletonConfig<T>): SingletonHandlers {
  const cols = getTableColumns(cfg.table);
  const base = selectable(cfg.table);
  const revalidate = cfg.revalidate ?? true;

  const current = async (db: Db): Promise<Row<T> | null> => {
    const rows: Row<T>[] = await db.select(cols).from(base).limit(1);
    return rows[0] ?? null;
  };

  return {
    GET: () => guarded(`${cfg.name} GET`, async (db) => ok(await current(db))),

    PUT: (request) =>
      guarded(`${cfg.name} PUT`, async (db) => {
        const body = await readBody(request);
        if (!body) return bad("Invalid JSON body", 400);
        const existing = await current(db);
        const parsed = cfg.parse(body, existing);
        if (!("values" in parsed)) return bad(parsed.error, 400);
        // The table is a single row by design, so the update needs no key to aim at.
        const rows = existing
          ? await db.update(cfg.table).set(parsed.values).returning(cols)
          : await db.insert(cfg.table).values(parsed.values).returning(cols);
        if (revalidate) revalidateContent();
        return ok(firstRow(rows));
      }),
  };
}
