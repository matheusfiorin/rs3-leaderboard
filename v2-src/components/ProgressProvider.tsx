"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  emptySnapshot,
  generateSyncCode,
  getSyncCode,
  loadLocal,
  merge,
  pullRemote,
  pushRemote,
  remoteConfigured,
  saveLocal,
  setSyncCode as persistCode,
  toPlain,
  type ProgressSnapshot,
  type ProgressValue,
} from "@/lib/progress";

export type SyncState = "local" | "syncing" | "synced" | "error";

interface ProgressApi {
  /** Flat key -> value map for the requirement evaluator. */
  values: Record<string, ProgressValue>;
  get(key: string): ProgressValue | undefined;
  isDone(key: string): boolean;
  count(key: string): number;
  set(key: string, value: ProgressValue): void;
  toggle(key: string): void;
  /** Bulk write — one stamp, one push. */
  setMany(patch: Record<string, ProgressValue>): void;
  reset(): void;

  syncState: SyncState;
  syncCode: string | null;
  remoteAvailable: boolean;
  lastSyncedAt: number | null;
  linkDevice(code: string): Promise<boolean>;
  createSyncCode(): Promise<string | null>;
  unlink(): void;
  syncNow(): Promise<void>;
  /** Export/import for the no-backend path. */
  exportSnapshot(): string;
  importSnapshot(json: string): boolean;
}

const Ctx = createContext<ProgressApi | null>(null);

const PUSH_DEBOUNCE_MS = 1200;

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<ProgressSnapshot>(emptySnapshot);
  const [syncCode, setCode] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const codeRef = useRef(syncCode);
  codeRef.current = syncCode;

  // Hydrate from localStorage after mount. Doing this in useState's initialiser
  // would desync server and client HTML and trip a hydration mismatch.
  useEffect(() => {
    const local = loadLocal();
    setSnap(local);
    const code = getSyncCode();
    if (code) setCode(code);
  }, []);

  const schedulePush = useCallback(() => {
    if (!remoteConfigured() || !codeRef.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      const code = codeRef.current;
      if (!code) return;
      setSyncState("syncing");
      const ok = await pushRemote(code, snapRef.current);
      setSyncState(ok ? "synced" : "error");
      if (ok) setLastSyncedAt(Date.now());
    }, PUSH_DEBOUNCE_MS);
  }, []);

  const commit = useCallback(
    (next: ProgressSnapshot) => {
      setSnap(next);
      saveLocal(next);
      schedulePush();
    },
    [schedulePush],
  );

  const setMany = useCallback(
    (patch: Record<string, ProgressValue>) => {
      const t = Date.now();
      const entries = { ...snapRef.current.entries };
      for (const [k, v] of Object.entries(patch)) entries[k] = { v, t };
      commit({ version: snapRef.current.version, entries });
    },
    [commit],
  );

  const set = useCallback(
    (key: string, value: ProgressValue) => setMany({ [key]: value }),
    [setMany],
  );

  const toggle = useCallback(
    (key: string) => {
      const cur = snapRef.current.entries[key]?.v;
      setMany({ [key]: !(cur === true) });
    },
    [setMany],
  );

  const pullAndMerge = useCallback(
    async (code: string) => {
      setSyncState("syncing");
      const remote = await pullRemote(code);
      if (!remote) {
        // No row yet is a normal first-link state, not a failure — seed it.
        const ok = await pushRemote(code, snapRef.current);
        setSyncState(ok ? "synced" : "error");
        if (ok) setLastSyncedAt(Date.now());
        return ok;
      }
      const merged = merge(snapRef.current, remote);
      setSnap(merged);
      saveLocal(merged);
      const ok = await pushRemote(code, merged);
      setSyncState(ok ? "synced" : "error");
      if (ok) setLastSyncedAt(Date.now());
      return true;
    },
    [],
  );

  // Initial pull once a code is known, then re-pull whenever the tab regains
  // focus so a device left open picks up edits made elsewhere.
  useEffect(() => {
    if (!syncCode || !remoteConfigured()) return;
    void pullAndMerge(syncCode);
    const onVisible = () => {
      if (!document.hidden) void pullAndMerge(syncCode);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [syncCode, pullAndMerge]);

  // Same-device, multi-tab coherence.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "sexta-era:progress") return;
      const local = loadLocal();
      setSnap((cur) => merge(cur, local));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<ProgressApi>(() => {
    const values = toPlain(snap);
    return {
      values,
      get: (k) => values[k],
      isDone: (k) => values[k] === true,
      count: (k) => (typeof values[k] === "number" ? (values[k] as number) : 0),
      set,
      toggle,
      setMany,
      reset: () => commit(emptySnapshot()),

      syncState,
      syncCode,
      remoteAvailable: remoteConfigured(),
      lastSyncedAt,

      async linkDevice(code: string) {
        const clean = code.trim().toLowerCase();
        if (!clean) return false;
        persistCode(clean);
        setCode(clean);
        return pullAndMerge(clean);
      },

      async createSyncCode() {
        if (!remoteConfigured()) return null;
        const code = generateSyncCode();
        persistCode(code);
        setCode(code);
        await pullAndMerge(code);
        return code;
      },

      unlink() {
        persistCode(null);
        setCode(null);
        setSyncState("local");
      },

      async syncNow() {
        if (codeRef.current) await pullAndMerge(codeRef.current);
      },

      exportSnapshot: () => JSON.stringify(snapRef.current, null, 2),

      importSnapshot(json: string) {
        try {
          const parsed = JSON.parse(json) as ProgressSnapshot;
          if (!parsed || typeof parsed !== "object" || !parsed.entries) return false;
          commit(merge(snapRef.current, parsed));
          return true;
        } catch {
          return false;
        }
      },
    };
  }, [snap, set, toggle, setMany, commit, syncState, syncCode, lastSyncedAt, pullAndMerge]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
