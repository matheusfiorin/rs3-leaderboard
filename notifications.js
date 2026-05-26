/* =============================================
   RS3 Leaderboard — Notifications
   Today-only events with persistent seen-set so
   reloads never re-toast notifications the user
   has already viewed.
   Storage (via utils/storage.js, prefix `rs3lb-`):
     notif-events  → array of today's events
     notif-seen    → array of seen IDs, FIFO-capped
   ============================================= */

const NOTIF_MAX_EVENTS = 80;   // hard cap; should fit comfortably under quota
const NOTIF_SEEN_CAP = 500;    // ~2 weeks of activity across both players
const NOTIF_TOAST_TYPES = new Set(["levelup", "quest", "goal", "milestone"]);

function _notifStorageHas() { return typeof storage !== "undefined" && storage; }

function _notifLoad(key, fallback) {
  if (_notifStorageHas()) return storage.get(key, fallback);
  try {
    const raw = localStorage.getItem("rs3lb-" + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function _notifSave(key, val) {
  if (_notifStorageHas()) { storage.set(key, val); return; }
  try { localStorage.setItem("rs3lb-" + key, JSON.stringify(val)); } catch {}
}

function _notifTodayKey(ts) {
  const d = ts ? new Date(ts) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function _notifIsToday(ts) {
  return _notifTodayKey(ts) === _notifTodayKey();
}

function _notifDeriveId(type, player, payload) {
  const date = _notifTodayKey();
  let detail = "x";
  switch (type) {
    case "levelup":
      detail = `${payload && payload.skillName || "?"}:${payload && payload.level || 0}`;
      break;
    case "quest":
      detail = payload && payload.questName || "?";
      break;
    case "goal":
      detail = payload && payload.goalId || "?";
      break;
    case "milestone":
      detail = `${payload && payload.kind || "?"}:${payload && payload.value || 0}`;
      break;
    case "activity":
      detail = (payload && payload.text || "?").slice(0, 60).replace(/\s+/g, " ");
      break;
    default:
      detail = JSON.stringify(payload || {}).slice(0, 60);
  }
  return `${type}|${player || "?"}|${detail}|${date}`;
}

const notif = (function () {
  let _events = null;   // lazy-load on first call
  let _seen = null;     // Set<string>

  function _ensureLoaded() {
    if (_events === null) _events = _notifLoad("notif-events", []) || [];
    if (_seen === null) {
      const arr = _notifLoad("notif-seen", []) || [];
      _seen = new Set(arr);
    }
  }
  function _persist() {
    _notifSave("notif-events", _events);
    _notifSave("notif-seen", Array.from(_seen));
  }
  function _capSeen() {
    if (_seen.size <= NOTIF_SEEN_CAP) return;
    // FIFO purge: drop oldest entries. Set iteration order = insertion order.
    const overflow = _seen.size - NOTIF_SEEN_CAP;
    let i = 0;
    for (const id of _seen) {
      if (i++ >= overflow) break;
      _seen.delete(id);
    }
  }

  /**
   * Add a notification. Dedupes via seen-set so reloads never re-toast a
   * known event. Returns true if the event was newly added.
   */
  function add(input) {
    _ensureLoaded();
    if (!input || !input.type) return false;
    const ts = input.ts || Date.now();
    const id = input.id || _notifDeriveId(input.type, input.player, input.payload);

    // Drop events that aren't from today — keep them dedup-able via seen-set,
    // but never surface in panel/toast. Edge case: backfilled level-ups from a
    // cron drift can have stale timestamps; the seen-set guards re-toast.
    const isToday = _notifIsToday(ts);

    if (_seen.has(id)) return false;
    if (_events.some(e => e.id === id)) return false;

    const event = {
      id, type: input.type, ts, player: input.player || null,
      payload: input.payload || null,
      seen: false,
    };
    _seen.add(id);
    if (isToday) {
      _events.push(event);
      // Cap event buffer in case of a sudden flood
      if (_events.length > NOTIF_MAX_EVENTS) {
        _events.splice(0, _events.length - NOTIF_MAX_EVENTS);
      }
    }
    _capSeen();
    _persist();

    // Side-effects: toast for high-signal types only, dispatch event
    if (isToday && NOTIF_TOAST_TYPES.has(event.type) && typeof showToast === "function") {
      const msg = _notifToastText(event);
      if (msg) showToast(msg, event.type);
    }
    if (typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent("notif:added", { detail: { event } })); } catch {}
    }
    return true;
  }

  function _notifToastText(e) {
    const p = e.player || "?";
    const pl = e.payload || {};
    const lang = typeof currentLang !== "undefined" ? currentLang : "en";
    switch (e.type) {
      case "levelup": {
        const reached = typeof t === "function" ? t("toastReached") : "reached";
        return `🎉 ${p} ${reached} ${pl.skillName || "?"} ${pl.level || ""}!`;
      }
      case "quest": {
        const word = typeof t === "function" ? t("toastQuestsCompleted") : "completed";
        return `📜 ${p}: ${pl.questName || word}`;
      }
      case "goal":
        return `🎯 ${p}: ${pl.goalLabel || pl.goalId || (lang === "pt" ? "objetivo completo" : "goal complete")}`;
      case "milestone":
        return `🏆 ${p}: ${pl.label || pl.kind || ""}`;
      default:
        return null;
    }
  }

  function todayList() {
    _ensureLoaded();
    return _events
      .filter(e => _notifIsToday(e.ts))
      .slice()
      .sort((a, b) => b.ts - a.ts);
  }

  function unseenCount() {
    return todayList().filter(e => !e.seen).length;
  }

  function markAllSeen() {
    _ensureLoaded();
    let changed = false;
    for (const e of _events) {
      if (!e.seen) { e.seen = true; changed = true; }
    }
    if (changed) {
      _persist();
      if (typeof document !== "undefined") {
        const b = document.getElementById("notif-count");
        if (b) { b.hidden = true; b.textContent = "0"; }
      }
      if (typeof window !== "undefined") {
        try { window.dispatchEvent(new CustomEvent("notif:seen-changed")); } catch {}
      }
    }
  }

  /**
   * Drop events that aren't today. Called on every renderAll() so the panel
   * stays current across midnight rollover without a session restart.
   */
  function purgeOld() {
    _ensureLoaded();
    const before = _events.length;
    _events = _events.filter(e => _notifIsToday(e.ts));
    if (_events.length !== before) _persist();
  }

  function clearAll() {
    _events = [];
    _seen = new Set();
    _persist();
  }

  function _iconFor(type) {
    return { levelup: "⬆️", quest: "📜", boss: "⚔️", dungeon: "🏰", goal: "🎯", milestone: "🏆", activity: "💬" }[type] || "🔔";
  }

  function _rowText(e) {
    const pl = e.payload || {};
    const p = e.player || "";
    switch (e.type) {
      case "levelup": return `${p} → ${pl.skillName || "?"} ${pl.level || ""}`;
      case "quest":   return `${p}: ${pl.questName || ""}`;
      case "goal":    return `${p}: ${pl.goalLabel || pl.goalId || ""}`;
      case "milestone": return `${p}: ${pl.label || pl.kind || ""}`;
      case "activity": return `${p}: ${pl.text || ""}`;
      default: return p;
    }
  }

  function renderPanel(panelEl) {
    if (!panelEl) return;
    _ensureLoaded();
    const lang = typeof currentLang !== "undefined" ? currentLang : "en";
    const title = typeof t === "function" ? t("notifTitle") : "Notifications";
    const todayLabel = typeof t === "function" ? t("notifToday") : "Today";
    const emptyLabel = typeof t === "function" ? t("notifEmpty") : "Nothing new today";
    const markAll = typeof t === "function" ? t("notifMarkAllRead") : "Mark all read";
    const events = todayList();
    const unseen = events.filter(e => !e.seen).length;

    let body;
    if (events.length === 0) {
      body = `<div class="notif-empty">${emptyLabel}</div>`;
    } else {
      body = `<ul class="notif-list" role="list">` + events.map(e => {
        const tsLabel = new Date(e.ts).toLocaleTimeString(lang === "pt" ? "pt-BR" : "en-US", { hour: "2-digit", minute: "2-digit" });
        const safe = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
        return `<li class="notif-row ${e.seen ? "" : "notif-unseen"}" data-id="${safe(e.id)}">
          <span class="notif-icon" aria-hidden="true">${_iconFor(e.type)}</span>
          <span class="notif-text">${safe(_rowText(e))}</span>
          <span class="notif-time">${tsLabel}</span>
          ${e.seen ? "" : `<span class="notif-dot" aria-label="${lang === "pt" ? "Não vista" : "Unseen"}"></span>`}
        </li>`;
      }).join("") + `</ul>`;
    }

    panelEl.innerHTML = `
      <div class="notif-head">
        <div class="notif-h-left">
          <span class="notif-h-title">${title}</span>
          <span class="notif-h-sub">${todayLabel}</span>
        </div>
        <button class="notif-mark" id="notif-mark-all" type="button" ${unseen ? "" : "disabled"}>${markAll}</button>
      </div>
      <div class="notif-body">${body}</div>
    `;

    const markBtn = panelEl.querySelector("#notif-mark-all");
    if (markBtn) {
      markBtn.addEventListener("click", () => {
        notif.markAllSeen();
        notif.renderPanel(panelEl);
        notif.updateBadge();
      });
    }
  }

  function updateBadge() {
    const badge = document.getElementById("notif-count");
    if (!badge) return;
    const n = unseenCount();
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = n > 99 ? "99+" : String(n);
    } else {
      badge.hidden = true;
      badge.textContent = "0";
    }
  }

  // Public API
  return { add, todayList, unseenCount, markAllSeen, purgeOld, clearAll, renderPanel, updateBadge, _deriveId: _notifDeriveId };
})();

// Cross-tab sync: another tab adding/marking a notification should refresh
// this tab's badge + open panel.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!e || (e.key !== "rs3lb-notif-events" && e.key !== "rs3lb-notif-seen")) return;
    notif.updateBadge();
    const panel = document.getElementById("notif-panel");
    if (panel && !panel.hidden) notif.renderPanel(panel);
  });
  // Cold-load badge once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => notif.updateBadge());
  } else {
    notif.updateBadge();
  }
}
