"use client";

import { useState } from "react";
import {
  Check as CheckIcon,
  Copy,
  Download,
  Link2,
  Loader2,
  RefreshCw,
  Smartphone,
  Unlink,
  Upload,
} from "lucide-react";
import { clsx } from "clsx";
import { Card, Pill, SectionHead } from "@/components/primitives";
import { RelativeTime } from "@/components/ui";
import { useProgress } from "@/components/ProgressProvider";

/**
 * Everything the user manually tracks — boss kill counts, "I own Ice Gloves",
 * completionist ticks — lives in the progress store. This panel is where they
 * make that store follow them to a second device.
 *
 * Two paths, because the cloud path needs a backend that may not be configured:
 *   linked   a sync code identifies one shared row; every device with the code
 *            pulls on focus and pushes on write.
 *   manual   export/import a JSON blob. Always available, zero setup, no server.
 */
export function SyncPanel() {
  const progress = useProgress();
  const [codeInput, setCodeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const trackedCount = Object.values(progress.values).filter(
    (v) => v === true || (typeof v === "number" && v > 0),
  ).length;

  async function handleCreate() {
    setBusy(true);
    const code = await progress.createSyncCode();
    setBusy(false);
    setNotice(
      code
        ? { tone: "ok", text: "Sync code created. Open this site on your other device and paste it there." }
        : { tone: "err", text: "Could not create a sync code — the sync backend is not configured." },
    );
  }

  async function handleLink() {
    const code = codeInput.trim();
    if (!code) return;
    setBusy(true);
    const ok = await progress.linkDevice(code);
    setBusy(false);
    setCodeInput("");
    setNotice(
      ok
        ? { tone: "ok", text: "Linked. Your progress from both devices has been merged." }
        : { tone: "err", text: "Could not reach the sync service. Progress is still saved on this device." },
    );
  }

  function handleCopy() {
    if (!progress.syncCode) return;
    void navigator.clipboard.writeText(progress.syncCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleExport() {
    const blob = new Blob([progress.exportSnapshot()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sexta-era-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const ok = progress.importSnapshot(importText);
    setNotice(
      ok
        ? { tone: "ok", text: "Imported and merged with what was already here." }
        : { tone: "err", text: "That did not look like a progress export." },
    );
    if (ok) setImportText("");
  }

  return (
    <div className="space-y-6">
      <SectionHead
        title="Sync"
        hint="Manual progress across devices"
        right={<StatusPill />}
      />

      <Card className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Smartphone size={18} className="text-ink-3 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-ink-2">
              {progress.remoteAvailable
                ? "Kill counts and checklists are saved on this device automatically. To see them on your phone as well, link both with the same sync code."
                : "Kill counts and checklists are saved in this browser and stay here. Cloud sync is not enabled on this build, so use the export and import below to move them to another device."}
            </p>
            <p className="mt-1.5 text-xs text-ink-3">
              {trackedCount} item{trackedCount === 1 ? "" : "s"} tracked
              {progress.lastSyncedAt && (
                <>
                  {" · "}
                  <RelativeTime date={progress.lastSyncedAt} prefix="synced" />
                </>
              )}
            </p>
          </div>
        </div>

        {/* When there is no backend, the entire sync-code apparatus is a lie:
            it offers to create codes that cannot be stored and to link devices
            that will never see each other. Hide it rather than let it claim
            something untrue about where the user's data lives. */}
        {!progress.remoteAvailable ? (
          <p className="text-xs text-ink-3 bg-bg-raised/60 border border-line rounded-md px-3 py-2">
            Nothing is uploaded anywhere. To enable cross-device sync, see
            SYNC_SETUP.md in the repository — it takes about five minutes and
            needs a free Supabase project.
          </p>
        ) : progress.syncCode ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-3 mb-1.5">
                Your sync code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 h-10 px-3 grid items-center rounded-md bg-bg-raised border border-line font-mono text-sm text-ink tracking-wider truncate">
                  {progress.syncCode}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="grid place-items-center w-10 h-10 rounded-md border border-line text-ink-3 hover:text-ink hover:border-line-strong transition-colors"
                  aria-label="Copy sync code"
                >
                  {copied ? <CheckIcon size={15} className="text-success" /> : <Copy size={15} />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-faint">
                Anyone with this code can read and write your tracked progress.
                Share it only with your own devices.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void progress.syncNow()}
                disabled={busy}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-line text-xs text-ink-2 hover:text-ink hover:border-line-strong transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={progress.syncState === "syncing" ? "animate-spin" : ""} />
                Sync now
              </button>
              <button
                type="button"
                onClick={() => progress.unlink()}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-line text-xs text-ink-3 hover:text-danger hover:border-danger/40 transition-colors"
              >
                <Unlink size={13} />
                Unlink this device
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
                First device
              </p>
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy || !progress.remoteAvailable}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-prayer/40 text-xs text-prayer-bright hover:bg-prayer/10 transition-colors disabled:opacity-40"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                Create a sync code
              </button>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="sync-code"
                className="block text-[11px] font-mono uppercase tracking-wider text-ink-3"
              >
                Already have one
              </label>
              <div className="flex gap-2">
                <input
                  id="sync-code"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="xxxxx-xxxxx-xxxxx-xxxxx"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 min-w-0 h-9 px-3 rounded-md bg-bg-raised border border-line font-mono text-xs text-ink placeholder:text-ink-faint focus:border-prayer/50 outline-none"
                />
                <button
                  type="button"
                  onClick={handleLink}
                  disabled={busy || !codeInput.trim()}
                  className="h-9 px-3 rounded-md border border-line text-xs text-ink-2 hover:text-ink hover:border-line-strong transition-colors disabled:opacity-40"
                >
                  Link
                </button>
              </div>
            </div>
          </div>
        )}

        {notice && (
          <p
            className={clsx(
              "text-xs rounded-md px-3 py-2 border",
              notice.tone === "ok"
                ? "text-success bg-success/5 border-success/20"
                : "text-danger bg-danger/5 border-danger/20",
            )}
            role="status"
          >
            {notice.text}
          </p>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h3 className="font-display italic text-lg text-ink">Backup by hand</h3>
          <p className="mt-1 text-xs text-ink-3">
            Works with no server. Download a file here, paste it in there.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-line text-xs text-ink-2 hover:text-ink hover:border-line-strong transition-colors"
          >
            <Download size={13} />
            Export progress
          </button>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="import-json"
            className="block text-[11px] font-mono uppercase tracking-wider text-ink-3"
          >
            Import
          </label>
          <textarea
            id="import-json"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={3}
            placeholder="Paste an exported progress file here"
            spellCheck={false}
            className="w-full rounded-md bg-bg-raised border border-line px-3 py-2 font-mono text-[11px] text-ink placeholder:text-ink-faint focus:border-prayer/50 outline-none resize-y"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={!importText.trim()}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-line text-xs text-ink-2 hover:text-ink hover:border-line-strong transition-colors disabled:opacity-40"
          >
            <Upload size={13} />
            Import and merge
          </button>
        </div>
      </Card>
    </div>
  );
}

function StatusPill() {
  const { syncState, syncCode, remoteAvailable } = useProgress();
  if (!remoteAvailable) return <Pill tone="neutral">Local only</Pill>;
  if (!syncCode) return <Pill tone="neutral">Not linked</Pill>;
  if (syncState === "syncing") return <Pill tone="prayer">Syncing…</Pill>;
  if (syncState === "error") return <Pill tone="danger">Offline</Pill>;
  return <Pill tone="success">Synced</Pill>;
}
