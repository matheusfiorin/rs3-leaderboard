/**
 * Manual-progress store.
 *
 * Anything the RuneScape APIs can't see — "I own Ice Gloves", "Vorago KC: 42",
 * "learned the Zuk rotation" — lives here. The user asked for this to survive
 * closing the tab AND to follow them to another device, so the store is built
 * as two layers:
 *
 *   local   localStorage. Always on. Instant, offline, zero setup.
 *   remote  Optional JSON row keyed by a user-chosen sync code. When
 *           configured, every write pushes and every load pulls+merges.
 *
 * Merge is per-key last-write-wins on a millisecond stamp, not whole-blob
 * replace. Two devices editing different checkboxes both keep their edit; the
 * same checkbox resolves to whichever was touched later.
 */

export const PROGRESS_VERSION = 2;

export type ProgressValue = boolean | number;

export interface ProgressEntry {
  v: ProgressValue;
  /** epoch ms of the last write to this key */
  t: number;
}

export interface ProgressSnapshot {
  version: number;
  entries: Record<string, ProgressEntry>;
}

const LOCAL_KEY = "sexta-era:progress";
const CODE_KEY = "sexta-era:sync-code";

export function emptySnapshot(): ProgressSnapshot {
  return { version: PROGRESS_VERSION, entries: {} };
}

/** Flatten to the plain map the requirement evaluator expects. */
export function toPlain(snap: ProgressSnapshot): Record<string, ProgressValue> {
  const out: Record<string, ProgressValue> = {};
  for (const [k, e] of Object.entries(snap.entries)) out[k] = e.v;
  return out;
}

/** Per-key last-write-wins. Order of arguments does not matter. */
export function merge(a: ProgressSnapshot, b: ProgressSnapshot): ProgressSnapshot {
  const entries: Record<string, ProgressEntry> = { ...a.entries };
  for (const [k, be] of Object.entries(b.entries)) {
    const ae = entries[k];
    if (!ae || be.t > ae.t) entries[k] = be;
  }
  return { version: PROGRESS_VERSION, entries };
}

// ---------------------------------------------------------------------------
// Local layer
// ---------------------------------------------------------------------------

function migrate(raw: unknown): ProgressSnapshot {
  if (!raw || typeof raw !== "object") return emptySnapshot();
  const obj = raw as Record<string, unknown>;

  // v2 shape
  if (obj.version === PROGRESS_VERSION && obj.entries && typeof obj.entries === "object") {
    return obj as unknown as ProgressSnapshot;
  }

  // v1 / legacy vanilla-app shape: a flat { key: true } map with no stamps.
  // Import it at t=0 so any stamped remote edit wins over an un-stamped local
  // leftover.
  const entries: Record<string, ProgressEntry> = {};
  const src = (obj.entries && typeof obj.entries === "object" ? obj.entries : obj) as Record<string, unknown>;
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === "boolean" || typeof v === "number") entries[k] = { v, t: 0 };
  }
  return { version: PROGRESS_VERSION, entries };
}

export function loadLocal(): ProgressSnapshot {
  if (typeof localStorage === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? migrate(JSON.parse(raw)) : emptySnapshot();
  } catch {
    return emptySnapshot();
  }
}

export function saveLocal(snap: ProgressSnapshot): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(snap));
  } catch {
    // Quota or private-mode. The in-memory copy still works for this session.
  }
}

export function getSyncCode(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

export function setSyncCode(code: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Remote layer
// ---------------------------------------------------------------------------

/**
 * Supabase REST. The anon key is designed to be shipped in a browser bundle —
 * it grants only what row-level security allows, and the table policy is
 * "anyone may read/write the row whose id equals the requested code". A sync
 * code is therefore a bearer secret: long, random, and shared only between
 * your own devices.
 */
const SYNC_URL = process.env.NEXT_PUBLIC_SYNC_URL ?? "";
const SYNC_KEY = process.env.NEXT_PUBLIC_SYNC_KEY ?? "";
const SYNC_TABLE = process.env.NEXT_PUBLIC_SYNC_TABLE ?? "progress";

export function remoteConfigured(): boolean {
  return Boolean(SYNC_URL && SYNC_KEY);
}

function endpoint(code: string): string {
  const base = SYNC_URL.replace(/\/$/, "");
  return `${base}/rest/v1/${SYNC_TABLE}?id=eq.${encodeURIComponent(code)}`;
}

const headers = () => ({
  apikey: SYNC_KEY,
  Authorization: `Bearer ${SYNC_KEY}`,
  "Content-Type": "application/json",
});

export async function pullRemote(code: string): Promise<ProgressSnapshot | null> {
  if (!remoteConfigured() || !code) return null;
  try {
    const r = await fetch(`${endpoint(code)}&select=payload`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as { payload?: unknown }[];
    if (!rows.length) return null;
    return migrate(rows[0]?.payload);
  } catch {
    return null;
  }
}

export async function pushRemote(code: string, snap: ProgressSnapshot): Promise<boolean> {
  if (!remoteConfigured() || !code) return false;
  try {
    const base = SYNC_URL.replace(/\/$/, "");
    const r = await fetch(`${base}/rest/v1/${SYNC_TABLE}`, {
      method: "POST",
      headers: {
        ...headers(),
        // Upsert: insert, or overwrite when the id already exists.
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: code,
        payload: snap,
        updated_at: new Date().toISOString(),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// External store
//
// localStorage is an external system, so React subscribes to it via
// useSyncExternalStore rather than mirroring it into component state. That
// keeps the server snapshot (always empty) distinct from the client one, so
// hydration matches without a "did we mount yet" flag, and it means every tab
// and every provider instance reads one source of truth.
// ---------------------------------------------------------------------------

export type SyncState = "local" | "syncing" | "synced" | "error";

export interface StoreState {
  snapshot: ProgressSnapshot;
  code: string | null;
  sync: SyncState;
  lastSyncedAt: number | null;
}

/** Stable identity — useSyncExternalStore requires getServerSnapshot to be
 *  referentially stable or it re-renders forever. */
const SERVER_STATE: StoreState = {
  snapshot: emptySnapshot(),
  code: null,
  sync: "local",
  lastSyncedAt: null,
};

let state: StoreState | null = null;
const listeners = new Set<() => void>();
let bridged = false;

function ensure(): StoreState {
  if (state === null) {
    state = {
      snapshot: loadLocal(),
      code: getSyncCode(),
      sync: "local",
      lastSyncedAt: null,
    };
  }
  return state;
}

function emit(): void {
  for (const l of listeners) l();
}

/** Replace state. Always produces a new object so snapshot identity changes. */
export function patchState(patch: Partial<StoreState>): void {
  state = { ...ensure(), ...patch };
  emit();
}

export function getState(): StoreState {
  return ensure();
}

export function getServerState(): StoreState {
  return SERVER_STATE;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);

  // Bridge the cross-tab storage event exactly once, not per subscriber.
  if (!bridged && typeof window !== "undefined") {
    bridged = true;
    window.addEventListener("storage", (e) => {
      if (e.key !== LOCAL_KEY) return;
      patchState({ snapshot: merge(ensure().snapshot, loadLocal()) });
    });
  }

  return () => {
    listeners.delete(fn);
  };
}

/** Write entries with a single timestamp, persist, and notify. */
export function writeEntries(patch: Record<string, ProgressValue>): ProgressSnapshot {
  const t = Date.now();
  const cur = ensure().snapshot;
  const entries = { ...cur.entries };
  for (const [k, v] of Object.entries(patch)) entries[k] = { v, t };
  const next: ProgressSnapshot = { version: PROGRESS_VERSION, entries };
  saveLocal(next);
  patchState({ snapshot: next });
  return next;
}

export function replaceSnapshot(next: ProgressSnapshot): void {
  saveLocal(next);
  patchState({ snapshot: next });
}

export function setCode(code: string | null): void {
  setSyncCode(code);
  patchState({ code, sync: code ? "syncing" : "local" });
}

/** Crypto-random, human-transcribable sync code. */
export function generateSyncCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
}
