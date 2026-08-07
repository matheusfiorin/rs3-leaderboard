"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  emptySnapshot,
  generateSyncCode,
  getServerState,
  getState,
  merge,
  patchState,
  pullRemote,
  pushRemote,
  remoteConfigured,
  replaceSnapshot,
  setCode,
  subscribe,
  toPlain,
  writeEntries,
  type ProgressSnapshot,
  type ProgressValue,
  type SyncState,
} from "@/lib/progress";

interface ProgressApi {
  /** Flat key -> value map for the requirement evaluator. */
  values: Record<string, ProgressValue>;
  get(key: string): ProgressValue | undefined;
  isDone(key: string): boolean;
  count(key: string): number;
  set(key: string, value: ProgressValue): void;
  toggle(key: string): void;
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
  exportSnapshot(): string;
  importSnapshot(json: string): boolean;
}

const Ctx = createContext<ProgressApi | null>(null);

const PUSH_DEBOUNCE_MS = 1200;

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  // localStorage is an external system; subscribing to it keeps the server
  // render (always the empty snapshot) and the client render consistent
  // without mirroring anything into component state.
  const state = useSyncExternalStore(subscribe, getState, getServerState);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePush = useCallback(() => {
    if (!remoteConfigured()) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      const { code, snapshot } = getState();
      if (!code) return;
      patchState({ sync: "syncing" });
      const ok = await pushRemote(code, snapshot);
      patchState({
        sync: ok ? "synced" : "error",
        ...(ok ? { lastSyncedAt: Date.now() } : {}),
      });
    }, PUSH_DEBOUNCE_MS);
  }, []);

  const setMany = useCallback(
    (patch: Record<string, ProgressValue>) => {
      writeEntries(patch);
      schedulePush();
    },
    [schedulePush],
  );

  const pullAndMerge = useCallback(async (code: string): Promise<boolean> => {
    patchState({ sync: "syncing" });
    const remote = await pullRemote(code);

    // No row yet is the normal first-link state, not a failure — seed it.
    const local = getState().snapshot;
    const next = remote ? merge(local, remote) : local;
    if (remote) replaceSnapshot(next);

    const ok = await pushRemote(code, next);
    patchState({
      sync: ok ? "synced" : "error",
      ...(ok ? { lastSyncedAt: Date.now() } : {}),
    });
    return ok || Boolean(remote);
  }, []);

  // Pull once a code is known, then again whenever the tab regains focus so a
  // device left open picks up edits made elsewhere. Every state write happens
  // inside an async callback, never synchronously in the effect body.
  useEffect(() => {
    const code = state.code;
    if (!code || !remoteConfigured()) return;

    let cancelled = false;
    const run = () => {
      if (!cancelled && !document.hidden) void pullAndMerge(code);
    };
    run();
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", run);
    };
  }, [state.code, pullAndMerge]);

  useEffect(() => {
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, []);

  const api = useMemo<ProgressApi>(() => {
    const values = toPlain(state.snapshot);
    return {
      values,
      get: (k) => values[k],
      isDone: (k) => values[k] === true,
      count: (k) => (typeof values[k] === "number" ? (values[k] as number) : 0),
      set: (key, value) => setMany({ [key]: value }),
      toggle: (key) => setMany({ [key]: values[key] !== true }),
      setMany,
      reset: () => {
        replaceSnapshot(emptySnapshot());
        schedulePush();
      },

      syncState: state.sync,
      syncCode: state.code,
      remoteAvailable: remoteConfigured(),
      lastSyncedAt: state.lastSyncedAt,

      async linkDevice(code: string) {
        const clean = code.trim().toLowerCase();
        if (!clean) return false;
        setCode(clean);
        return pullAndMerge(clean);
      },

      async createSyncCode() {
        if (!remoteConfigured()) return null;
        const code = generateSyncCode();
        setCode(code);
        await pullAndMerge(code);
        return code;
      },

      unlink: () => setCode(null),

      async syncNow() {
        const code = getState().code;
        if (code) await pullAndMerge(code);
      },

      exportSnapshot: () => JSON.stringify(getState().snapshot, null, 2),

      importSnapshot(json: string) {
        try {
          const parsed = JSON.parse(json) as ProgressSnapshot;
          if (!parsed || typeof parsed !== "object" || !parsed.entries) return false;
          replaceSnapshot(merge(getState().snapshot, parsed));
          schedulePush();
          return true;
        } catch {
          return false;
        }
      },
    };
  }, [state, setMany, schedulePush, pullAndMerge]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
