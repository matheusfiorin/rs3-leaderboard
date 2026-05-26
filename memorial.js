/* =============================================
   RS3 Leaderboard — In Memoriam
   Frozen tribute section for retired players. Reads
   archived data/fiorovizk_*.json (left untouched
   after the player retired 2026-05-21). Renders an
   illuminated-manuscript card above Mission Control.
   ============================================= */

const MEMORIAL_CONFIG = {
  name: "Fiorovizk",
  profilePath: "data/fiorovizk_profile.json",
  hiscoresPath: "data/fiorovizk_hiscores.json",
  mountId: "memorial-mount",
};

// Frozen tribute data — derived once from MEMORIAL_CONFIG fetches.
let _memorialData = null;

// ---- i18n helper that falls through to the global t() ----
function memT(key) {
  return typeof t === "function" ? t(key) : key;
}

// ---- Number helpers (mirror script.js fmt for locale awareness) ----
function memFmt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  return n.toLocaleString(lang === "pt" ? "pt-BR" : "en-US");
}

function memFmtXp(n) {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B XP";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M XP";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K XP";
  return n + " XP";
}

// ---- HTML escape (memorial-local copy so module is independent) ----
const _MEM_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function memEsc(s) {
  return s == null ? "" : String(s).replace(/[&<>"']/g, (c) => _MEM_ESC[c]);
}

// ---- Parse a RuneMetrics activity date string into ISO + locale-aware label ----
function memFormatActivityDate(raw) {
  // RuneMetrics returns "DD-Mon-YYYY HH:MM" e.g. "03-May-2026 07:51"
  if (!raw) return { iso: "", human: "—" };
  const m = raw.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return { iso: "", human: raw };
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const d = new Date(Date.UTC(+m[3], months[m[2]] || 0, +m[1], +m[4], +m[5]));
  if (Number.isNaN(d.getTime())) return { iso: "", human: raw };
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  return {
    iso: d.toISOString(),
    human: d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { year: "numeric", month: "short", day: "2-digit" }),
  };
}

// ---- Fetch + compute frozen vitals ----
async function loadMemorialData() {
  if (_memorialData) return _memorialData;

  // Reuse cacheFetch() from script.js for consistent revalidation behavior.
  // Falls back to plain fetch() so memorial.js stays usable in isolation.
  const fetcher = typeof cacheFetch === "function"
    ? cacheFetch
    : async (p) => { const r = await fetch(p, { cache: "no-cache" }); if (!r.ok) throw new Error("fetch_failed"); return r.json(); };

  let profile, hiscores;
  try {
    [profile, hiscores] = await Promise.all([
      fetcher(MEMORIAL_CONFIG.profilePath),
      fetcher(MEMORIAL_CONFIG.hiscoresPath),
    ]);
  } catch (_) {
    return null;
  }
  if (!profile || profile.error || !hiscores || !Array.isArray(hiscores.skills)) {
    return null;
  }

  // Top-3 highest XP skills, excluding id 0 (Overall).
  const top = (hiscores.skills || [])
    .filter((s) => s && s.id !== 0 && (s.xp || 0) > 0)
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, 3)
    .map((s) => ({ id: s.id, name: s.name, level: s.level, xp: s.xp }));

  // Last activity entry — RuneMetrics returns them newest-first.
  const lastAct = (profile.activities || [])[0];
  const lastDate = lastAct ? memFormatActivityDate(lastAct.date) : { iso: "", human: "—" };

  // Activities (first 12 used for archive disclosure).
  const activities = (profile.activities || []).slice(0, 12).map((a) => {
    const d = memFormatActivityDate(a.date);
    return {
      iso: d.iso,
      date: d.human,
      text: a.text || a.details || "",
    };
  });

  _memorialData = {
    name: profile.name || MEMORIAL_CONFIG.name,
    combat: profile.combatlevel ?? "—",
    totalLevel: profile.totalskill,
    totalXp: profile.totalxp,
    qp: Array.isArray(profile.activities) ? null : null,  // computed below
    quests: profile.questscomplete,
    top,
    lastSeenISO: lastDate.iso,
    lastSeenHuman: lastDate.human,
    activities,
  };

  // Quest points from quests file if available (more accurate than profile counter).
  // The cron archives quests at data/fiorovizk_quests.json; load best-effort.
  try {
    const quests = await fetcher("data/fiorovizk_quests.json");
    if (quests && Array.isArray(quests.quests)) {
      _memorialData.qp = quests.quests
        .filter((q) => q.status === "COMPLETED")
        .reduce((sum, q) => sum + (q.questPoints || 0), 0);
      _memorialData.quests = quests.quests.filter((q) => q.status === "COMPLETED").length;
    }
  } catch (_) {
    // Fall back to profile counter; questsstarted+complete not summable.
    _memorialData.qp = "—";
  }

  return _memorialData;
}

// ---- Render: chiseled-marble-plaque ribbon (redesign 2026-05-22) ----
function memorialTemplate(MEM) {
  const initial = (MEM.name || "—").charAt(0);
  const totalXpShort = memFmtXp(MEM.totalXp).replace(/\s*XP$/i, "");
  return `
<section class="mem-frame" role="region" aria-labelledby="mem-name">
  <svg class="mem-corner-flourish" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
    <path d="M2 2 L14 2 M2 2 L2 14 M2 2 Q11 4 14 14 Q4 11 2 2 Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
    <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
  </svg>

  <div class="mem-banner">
    <div class="mem-monogram">
      <p class="mem-eyebrow"><span class="mem-eyebrow-rule"></span>${memEsc(memT("memorialTitle"))}</p>
      <div class="mem-monogram-row">
        <span class="mem-monogram-initial" aria-hidden="true">${memEsc(initial)}</span>
        <h2 id="mem-name" class="mem-name">${memEsc(MEM.name)}</h2>
      </div>
      <p class="mem-dates">
        <span class="mem-roman">MMXXVI</span>
        <span class="mem-dot" aria-hidden="true">&middot;</span>
        <span class="mem-sub">${memEsc(memT("memorialSub"))}</span>
      </p>
    </div>

    <dl class="mem-vitals" aria-label="${memEsc(memT("memorialFinalStats"))}">
      <div class="mem-vital"><dt>${memEsc(memT("memorialVitalCombat"))}</dt><dd>${memFmt(MEM.combat)}</dd></div>
      <div class="mem-vital"><dt>${memEsc(memT("memorialVitalTotal"))}</dt><dd>${memFmt(MEM.totalLevel)}</dd></div>
      <div class="mem-vital"><dt>${memEsc(memT("memorialVitalXp"))}</dt><dd>${memEsc(totalXpShort)}</dd></div>
      <div class="mem-vital"><dt>${memEsc(memT("memorialVitalQp"))}</dt><dd>${memFmt(MEM.qp)}</dd></div>
      <div class="mem-vital"><dt>${memEsc(memT("memorialVitalQuests"))}</dt><dd>${memFmt(MEM.quests)}</dd></div>
    </dl>

    <div class="mem-aside">
      <ul class="mem-trophies" aria-label="${memEsc(memT("memorialTopSkills"))}">
        ${MEM.top.map((s) => `
          <li class="mem-trophy">
            <span class="mem-trophy-dot" aria-hidden="true"></span>
            <span class="mem-trophy-skill">${memEsc(s.name)}</span>
            <span class="mem-trophy-lvl">${memEsc(s.level)}</span>
          </li>`).join("")}
      </ul>
      <details class="mem-journey">
        <summary class="mem-journey-trigger">
          <span class="mem-last">
            <span class="mem-last-label">${memEsc(memT("memorialLastSeen"))}</span>
            <time datetime="${memEsc(MEM.lastSeenISO)}">${memEsc(MEM.lastSeenHuman)}</time>
          </span>
          <span class="mem-journey-sep" aria-hidden="true">&middot;</span>
          <span class="mem-journey-label">${memEsc(memT("memorialViewJourney"))}</span>
          <svg class="mem-chev" viewBox="0 0 12 8" aria-hidden="true" focusable="false">
            <path d="M1 1 L6 6 L11 1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </summary>
        <div class="mem-journey-body" id="memorial-activities" role="list">
          ${MEM.activities.length
            ? MEM.activities.map((a) => `
              <div class="mem-activity" role="listitem">
                <time class="mem-activity-date" datetime="${memEsc(a.iso)}">${memEsc(a.date)}</time>
                <span class="mem-activity-text">${memEsc(a.text)}</span>
              </div>`).join("")
            : `<p class="mem-journey-empty">${memEsc(memT("memorialNoActivity"))}</p>`}
        </div>
      </details>
    </div>
  </div>

  <p class="mem-epitaph">
    <span class="mem-fleuron" aria-hidden="true">&#x2767;</span>
    <em>${memEsc(memT("memorialEpitaph"))}</em>
    <span class="mem-fleuron" aria-hidden="true">&#x2767;</span>
  </p>
</section>`;
}

async function renderMemorial() {
  injectMemorialStyles();
  const mount = document.getElementById(MEMORIAL_CONFIG.mountId);
  if (!mount) return;

  const data = await loadMemorialData();
  if (!data) {
    // Silent fail: do not show a broken card. Hide the mount so the dashboard
    // collapses cleanly when archive files are missing.
    mount.innerHTML = "";
    mount.hidden = true;
    return;
  }
  mount.hidden = false;
  mount.innerHTML = memorialTemplate(data);
}

// ---- Scoped style injection (idempotent, mirrors mgInjectStyles pattern) ----
function injectMemorialStyles() {
  if (document.getElementById("memorial-styles")) return;
  const style = document.createElement("style");
  style.id = "memorial-styles";
  style.textContent = MEMORIAL_CSS;
  document.head.appendChild(style);
}

const MEMORIAL_CSS = `
#memorial-mount[hidden] { display: none; }
#memorial-mount { display: block; }

.mem {
  margin: 8px 0 28px;
  --mem-parchment:   color-mix(in oklch, var(--bg-card) 78%, #1f1608);
  --mem-parchment-2: color-mix(in oklch, var(--bg-card) 86%, #34250e);
  --mem-ink:         color-mix(in oklch, var(--text-2) 96%, #f3d99e);
  --mem-ink-dim:     color-mix(in oklch, var(--text-3) 90%, #b8975a);
  --mem-rule-c:      color-mix(in oklch, var(--gold) 70%, #c08a3a);
  --mem-gold-aged:   color-mix(in oklch, var(--gold-bright) 75%, #d8b260);
  --mem-grain: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.42  0 0 0 0 0.22  0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  color: var(--mem-ink);
  font-family: var(--font-body, "Sora", sans-serif);
}

.mem-frame {
  position: relative;
  isolation: isolate;
  padding: 14px 18px 10px;
  background:
    radial-gradient(120% 200% at 50% -30%, rgba(212, 168, 90, 0.05) 0%, transparent 60%),
    linear-gradient(180deg, var(--mem-parchment-2), var(--mem-parchment) 65%);
  border: 1px dashed color-mix(in oklch, var(--gold) 48%, transparent);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px color-mix(in oklch, var(--gold) 16%, transparent),
    0 10px 22px -16px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}
.mem-frame::before {
  content: "";
  position: absolute; inset: 0;
  background-image: var(--mem-grain);
  background-size: 240px 240px;
  opacity: 0.4;
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 0;
}
.mem-frame > * { position: relative; z-index: 1; }

.mem-corner-flourish {
  position: absolute;
  top: 8px; left: 8px;
  width: 22px; height: 22px;
  color: var(--mem-gold-aged);
  opacity: 0.7;
  z-index: 2;
}

/* === Region grid === */
.mem-banner {
  display: grid;
  grid-template-columns: minmax(200px, 260px) minmax(0, 1fr) minmax(200px, 240px);
  align-items: center;
  gap: 22px;
  padding: 4px 12px 4px 28px;
}

/* === Region 1: monogram === */
.mem-monogram {
  display: flex; flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.mem-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  margin: 0;
  font-family: "Cinzel", serif;
  font-weight: 600;
  font-size: 0.62rem;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--mem-gold-aged);
}
.mem-eyebrow-rule {
  display: inline-block;
  width: 24px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--mem-gold-aged));
}
.mem-monogram-row {
  display: flex; align-items: baseline; gap: 12px;
  min-width: 0;
}
.mem-monogram-initial {
  font-family: "Cinzel", serif;
  font-weight: 900;
  font-size: clamp(3rem, 5vw, 4rem);
  line-height: 0.82;
  color: var(--mem-gold-aged);
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.45),
    0 0 14px rgba(212, 168, 90, 0.16);
  -webkit-text-stroke: 0.5px color-mix(in oklch, var(--gold) 30%, transparent);
  letter-spacing: -0.04em;
  flex: 0 0 auto;
}
.mem-name {
  margin: 0;
  font-family: "Cinzel", serif;
  font-weight: 700;
  font-size: clamp(1.05rem, 1.6vw, 1.35rem);
  letter-spacing: 0.18em;
  line-height: 1;
  color: color-mix(in oklch, var(--text) 94%, #f3d995);
  text-transform: uppercase;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
}
.mem-dates {
  margin: 4px 0 0;
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: 0.6rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mem-ink-dim);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mem-roman { color: var(--mem-gold-aged); font-weight: 700; }
.mem-dot { color: var(--mem-ink-dim); }
.mem-sub { font-style: italic; letter-spacing: 0.12em; }

/* === Region 2: vitals === */
.mem-vitals {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  margin: 0;
  padding: 6px 0;
  min-width: 0;
  border-left: 1px dotted color-mix(in oklch, var(--mem-rule-c) 32%, transparent);
  border-right: 1px dotted color-mix(in oklch, var(--mem-rule-c) 32%, transparent);
}
.mem-vital {
  position: relative;
  text-align: center;
  padding: 2px 8px;
  min-width: 0;
}
.mem-vital + .mem-vital::before {
  content: "";
  position: absolute;
  left: 0;
  top: 14%; bottom: 14%;
  border-left: 1px dotted color-mix(in oklch, var(--mem-rule-c) 50%, transparent);
}
.mem-vital dt {
  font-family: var(--font-mono, monospace);
  font-size: 0.58rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklch, var(--mem-ink-dim) 70%, var(--mem-ink));
  margin: 0 0 4px;
  white-space: nowrap;
}
.mem-vital dd {
  margin: 0;
  font-family: var(--font-mono, monospace);
  font-weight: 800;
  font-size: clamp(0.85rem, 1.1vw, 1rem);
  color: var(--mem-ink);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === Region 3: aside === */
.mem-aside {
  display: flex; flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}
.mem-trophies {
  list-style: none;
  margin: 0; padding: 0;
  display: flex; flex-direction: column;
  gap: 3px;
}
.mem-trophy {
  display: grid;
  grid-template-columns: 6px 1fr auto;
  align-items: baseline;
  gap: 8px;
  padding: 2px 10px;
  border-left: 2px solid var(--mem-gold-aged);
  background: linear-gradient(90deg, color-mix(in oklch, var(--gold) 8%, transparent), transparent 75%);
}
.mem-trophy-dot {
  width: 5px; height: 5px;
  background: var(--mem-gold-aged);
  border-radius: 50%;
  align-self: center;
}
.mem-trophy-skill {
  font-family: "Cinzel", serif;
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--mem-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mem-trophy-lvl {
  font-family: var(--font-mono, monospace);
  font-weight: 800;
  font-size: 0.82rem;
  color: var(--mem-gold-aged);
  font-variant-numeric: tabular-nums;
}

.mem-journey { color: var(--mem-ink-dim); }
.mem-journey-trigger {
  list-style: none;
  cursor: pointer;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  padding: 4px 0 0;
  margin: 2px 0 0;
  font-family: var(--font-mono, monospace);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mem-ink-dim);
  user-select: none;
}
.mem-journey-trigger::-webkit-details-marker { display: none; }
.mem-journey-trigger:focus-visible {
  outline: 2px solid var(--mem-gold-aged);
  outline-offset: 2px;
  border-radius: 2px;
}
.mem-last { display: inline-flex; align-items: baseline; gap: 6px; }
.mem-last time { color: var(--mem-ink); font-variant-numeric: tabular-nums; }
.mem-journey-sep { color: var(--mem-ink-dim); }
.mem-journey-label {
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
  text-decoration-color: color-mix(in oklch, var(--mem-gold-aged) 70%, transparent);
  color: var(--mem-gold-aged);
  transition: color 0.2s ease;
}
.mem-journey-trigger:hover .mem-journey-label { color: color-mix(in oklch, var(--mem-gold-aged) 88%, #fff5c7); }
.mem-chev { width: 8px; height: 6px; transition: transform 0.25s ease; color: var(--mem-gold-aged); }
.mem-journey[open] .mem-chev { transform: rotate(180deg); }

.mem-journey-body {
  margin: 10px -8px 0;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  background: color-mix(in oklch, var(--mem-parchment) 84%, #100b04);
  border-top: 1px dotted color-mix(in oklch, var(--mem-rule-c) 45%, transparent);
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--mem-gold-aged) transparent;
}
.mem-journey-body::-webkit-scrollbar { width: 5px; }
.mem-journey-body::-webkit-scrollbar-thumb { background: var(--mem-gold-aged); border-radius: 2px; }
.mem-activity {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  padding: 3px 0;
  font-size: 0.74rem;
  border-bottom: 1px dotted color-mix(in oklch, var(--mem-rule-c) 22%, transparent);
}
.mem-activity:last-child { border-bottom: none; }
.mem-activity-date {
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  color: var(--mem-ink-dim);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.mem-activity-text { color: var(--mem-ink); }
.mem-journey-empty {
  margin: 0;
  font-size: 0.74rem;
  color: var(--mem-ink-dim);
  font-style: italic;
}

/* Epitaph strip (chiseled inscription) */
.mem-epitaph {
  margin: 10px -6px 0;
  padding: 6px 12px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-top: 1px dotted color-mix(in oklch, var(--mem-rule-c) 40%, transparent);
  font-family: "Cinzel", serif;
  font-style: italic;
  font-size: 0.74rem;
  color: color-mix(in oklch, var(--mem-ink) 94%, #f3d99e);
  letter-spacing: 0.04em;
  line-height: 1.4;
  text-align: center;
}
.mem-fleuron {
  color: var(--mem-gold-aged);
  font-style: normal;
  font-size: 0.85rem;
  flex: 0 0 auto;
}
.mem-epitaph em { font-style: italic; }

/* === Mobile (≤720) — stacked tight === */
@media (max-width: 720px) {
  .mem-frame { padding: 12px 12px 8px; }
  .mem-banner {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 4px 4px 0;
  }
  .mem-monogram {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto auto;
    column-gap: 12px;
    row-gap: 2px;
    align-items: end;
  }
  .mem-eyebrow { grid-column: 2; grid-row: 1; }
  .mem-monogram-initial {
    grid-column: 1; grid-row: 1 / 4;
    font-size: 2.6rem;
    align-self: center;
  }
  .mem-name {
    grid-column: 2; grid-row: 2;
    font-size: 1rem;
    letter-spacing: 0.12em;
  }
  .mem-dates {
    grid-column: 2; grid-row: 3;
    margin: 0;
    font-size: 0.56rem;
  }
  .mem-vitals {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--mem-gold-aged) transparent;
    padding: 6px 0;
    border: 0;
    border-top: 1px dotted color-mix(in oklch, var(--mem-rule-c) 35%, transparent);
    border-bottom: 1px dotted color-mix(in oklch, var(--mem-rule-c) 35%, transparent);
  }
  .mem-vital { flex: 0 0 auto; min-width: 72px; }
  .mem-vital + .mem-vital::before { top: 18%; bottom: 18%; }
  .mem-aside { gap: 6px; }
  .mem-trophies {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 2px 0;
  }
  .mem-trophies::-webkit-scrollbar { display: none; }
  .mem-trophy {
    flex: 0 0 auto;
    grid-template-columns: 5px auto auto;
    gap: 5px;
    padding: 2px 8px;
    border-left: 0;
    border: 1px solid color-mix(in oklch, var(--mem-gold-aged) 40%, transparent);
    border-radius: 100px;
    background: color-mix(in oklch, var(--gold) 5%, transparent);
  }
  .mem-trophy-skill { font-size: 0.66rem; letter-spacing: 0; }
  .mem-trophy-lvl { font-size: 0.74rem; }
  .mem-journey-trigger { justify-content: space-between; gap: 6px; }
  .mem-epitaph { font-size: 0.7rem; gap: 10px; }
}

/* Extra-tight bin for sub-360 screens — keeps the 3 trophy chips on one
   line without scroll and shrinks the monogram cap so the name row
   doesn't ride against the right border. */
@media (max-width: 360px) {
  .mem-frame { padding: 10px 10px 6px; }
  .mem-monogram-initial { font-size: 2.1rem; }
  .mem-name { font-size: 0.92rem; letter-spacing: 0.08em; }
  .mem-vital { min-width: 60px !important; padding: 2px 4px; }
  .mem-vital dt { font-size: 0.5rem; letter-spacing: 0.14em; }
  .mem-vital dd { font-size: 0.78rem; }
  .mem-trophy { padding: 2px 6px; }
  .mem-trophy-skill { font-size: 0.6rem; }
  .mem-trophy-lvl { font-size: 0.7rem; }
  .mem-epitaph { font-size: 0.62rem; gap: 6px; padding: 4px 4px 0; }
}

@media (prefers-reduced-motion: reduce) {
  .mem-chev { transition: none !important; }
  .mem-journey-label { transition: none !important; }
}

@media (forced-colors: active) {
  .mem-frame { background: Canvas; box-shadow: 0 0 0 1px CanvasText inset; border-color: LinkText; }
  .mem-monogram-initial, .mem-name, .mem-vital dd, .mem-trophy-lvl,
  .mem-eyebrow, .mem-roman, .mem-corner-flourish, .mem-fleuron { color: LinkText !important; }
  .mem-trophy-skill, .mem-activity-text, .mem-last time { color: CanvasText !important; }
}
`;

// ---- Init: render on DOM ready (also re-rendered by updateUIText on lang flip) ----
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { renderMemorial(); });
  } else {
    renderMemorial();
  }
}
