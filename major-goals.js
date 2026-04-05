/* =============================================
   RS3 Leaderboard — Major Goals Cards
   Steam Big Picture-style tiles for the Overview.
   Reads progress from senntisten.js & prifddinas.js
   globals and renders into #major-goals.
   ============================================= */

// ---- i18n helper ----
function mgT(key) {
  const map = {
    mgTitle:       { pt: "Grandes Objetivos",           en: "Major Goals" },
    mgSoulSplit:   { pt: "Rumo ao Soul Split",          en: "Road to Soul Split" },
    mgSoulSub:     { pt: "The Temple at Senntisten",    en: "The Temple at Senntisten" },
    mgPrif:        { pt: "Rumo a Prifddinas",           en: "Road to Prifddinas" },
    mgPrifSub:     { pt: "Plague's End",                en: "Plague's End" },
    mgItems:       { pt: "itens completos",             en: "items complete" },
    mgComplete:    { pt: "Completo!",                   en: "Complete!" },
  };
  const global = typeof t === "function" ? t(key) : key;
  if (global !== key) return global;
  const entry = map[key];
  if (!entry) return key;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  return entry[lang] || entry.en || key;
}

// ---- SVG circular progress ring ----
function mgRing(pct, size, stroke, color) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const done = pct >= 100;
  const fillColor = done ? "var(--green)" : color;
  return `<svg class="mg-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}"
      fill="none" stroke="var(--bg-raised)" stroke-width="${stroke}" />
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}"
      fill="none" stroke="${fillColor}" stroke-width="${stroke}"
      stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${size / 2} ${size / 2})"
      style="transition:stroke-dashoffset .6s ease" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
      class="mg-ring-text" fill="${fillColor}"
      font-size="${size * 0.26}px" font-weight="800"
      font-family="var(--font-mono)">${Math.round(pct)}%</text>
  </svg>`;
}

// ---- Count done for Senntisten ----
function mgSnCount(player) {
  if (typeof SN_SKILLS === "undefined") return { done: 0, total: 0 };
  const manual = typeof snLoadManual === "function" ? snLoadManual() : {};
  let done = 0;
  const total = SN_SKILLS.length + SN_ALL_QUESTS.length + SN_MANUAL.length;
  for (const sk of SN_SKILLS) {
    if ((player.skills[sk.id] || {}).level >= sk.required) done++;
  }
  for (const q of SN_ALL_QUESTS) {
    if (hasQuest(player, q)) done++;
  }
  for (const m of SN_MANUAL) {
    if (manual[`${m.id}_${player.name}`]) done++;
  }
  return { done, total };
}

// ---- Count done for Prifddinas ----
function mgPeCount(player) {
  if (typeof PE_SKILLS === "undefined") return { done: 0, total: 0 };
  const manual = typeof peLoadManual === "function" ? peLoadManual() : {};
  let done = 0;
  const total = PE_SKILLS.length + PE_ALL_QUESTS.length + PE_MANUAL.length;
  for (const sk of PE_SKILLS) {
    if ((player.skills[sk.id] || {}).level >= sk.required) done++;
  }
  for (const q of PE_ALL_QUESTS) {
    if (hasQuest(player, q)) done++;
  }
  for (const m of PE_MANUAL) {
    if (manual[`${m.id}_${player.name}`]) done++;
  }
  return { done, total };
}

// ---- Navigate to tab ----
function mgGoTab(tabName) {
  const tabEl = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (tabEl) tabEl.click();
}

// ---- Player badge (small avatar chip) ----
function mgBadge(player, idx, pct) {
  const c = idx === 0 ? "p1" : "p2";
  const color = idx === 0 ? "var(--gold)" : "var(--teal)";
  const done = pct >= 100;
  return `<div class="mg-badge mg-badge-${c}">
    <span class="mg-badge-name">${esc(player.name)}</span>
    <span class="mg-badge-pct" style="color:${done ? "var(--green)" : color}">${Math.round(pct)}%</span>
  </div>`;
}

// ---- Build one goal card ----
function mgCard(cfg, players) {
  const counts = players.map((p) => cfg.count(p));
  // Combined progress (average of both)
  const totalDone = counts.reduce((a, c) => a + c.done, 0);
  const totalAll = counts.reduce((a, c) => a + c.total, 0);
  const combinedPct = totalAll > 0 ? (totalDone / totalAll) * 100 : 0;
  const done = combinedPct >= 100;

  const badges = players
    .map((p, i) => {
      const pct = counts[i].total > 0 ? (counts[i].done / counts[i].total) * 100 : 0;
      return mgBadge(p, i, pct);
    })
    .join("");

  const subtitle = done
    ? mgT("mgComplete")
    : `${totalDone}/${totalAll} ${mgT("mgItems")}`;

  return `<button class="mg-card mg-card-${cfg.theme}" onclick="mgGoTab('${cfg.tab}')" aria-label="${cfg.title}">
    <div class="mg-card-glow"></div>
    <div class="mg-card-body">
      <div class="mg-card-left">
        <div class="mg-card-icon">${cfg.icon}</div>
        <div class="mg-card-info">
          <div class="mg-card-title">${cfg.title}</div>
          <div class="mg-card-sub">${subtitle}</div>
          <div class="mg-badges">${badges}</div>
        </div>
      </div>
      <div class="mg-card-right">
        ${mgRing(combinedPct, 88, 6, cfg.ringColor)}
      </div>
    </div>
  </button>`;
}

// ---- Main render ----
function renderMajorGoals(players) {
  mgInjectStyles();
  const el = document.getElementById("major-goals");
  if (!el || !players || players.length === 0) return;

  const goals = [
    {
      title: mgT("mgSoulSplit"),
      icon: "\u2694\uFE0F",
      theme: "gold",
      tab: "senntisten",
      ringColor: "var(--gold-bright)",
      count: mgSnCount,
    },
  ];

  // Only show Prifddinas card if its module is loaded
  if (typeof PE_SKILLS !== "undefined") {
    goals.push({
      title: mgT("mgPrif"),
      icon: "\uD83C\uDFF0",
      theme: "teal",
      tab: "prifddinas",
      ringColor: "var(--teal-bright)",
      count: mgPeCount,
    });
  }

  el.innerHTML = `
    <div class="section-head" style="margin-top:24px">
      <h2 class="section-title">${mgT("mgTitle")}</h2>
    </div>
    <div class="mg-grid">${goals.map((g) => mgCard(g, players)).join("")}</div>`;
}

// ---- Inject scoped CSS (idempotent) ----
function mgInjectStyles() {
  if (document.getElementById("mg-styles")) return;
  const s = document.createElement("style");
  s.id = "mg-styles";
  s.textContent = `
/* ---- Major Goals Cards ---- */
.mg-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4, 16px);
  margin-bottom: var(--sp-6, 24px);
}
@media (min-width: 680px) {
  .mg-grid { grid-template-columns: repeat(2, 1fr); }
}

.mg-card {
  position: relative;
  display: block;
  width: 100%;
  min-height: 180px;
  border: 1px solid var(--border);
  border-radius: var(--radius, 10px);
  background: var(--bg-card);
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--text);
  padding: 0;
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}
.mg-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-glow);
}
.mg-card:active { transform: translateY(-1px); }

/* Theme: gold (Senntisten) */
.mg-card-gold {
  background: linear-gradient(135deg, rgba(212,168,67,0.10) 0%, var(--bg-card) 60%);
}
.mg-card-gold:hover {
  box-shadow: 0 8px 40px rgba(212,168,67,0.18), 0 0 60px rgba(212,168,67,0.06);
  border-color: var(--gold-dim);
}
.mg-card-gold .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(212,168,67,0.14) 0%, transparent 70%);
}
.mg-card-gold:hover .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(212,168,67,0.24) 0%, transparent 70%);
}

/* Theme: teal (Prifddinas) */
.mg-card-teal {
  background: linear-gradient(135deg, rgba(34,211,187,0.10) 0%, var(--bg-card) 60%);
}
.mg-card-teal:hover {
  box-shadow: 0 8px 40px rgba(34,211,187,0.18), 0 0 60px rgba(34,211,187,0.06);
  border-color: var(--teal-dim);
}
.mg-card-teal .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(34,211,187,0.14) 0%, transparent 70%);
}
.mg-card-teal:hover .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(34,211,187,0.24) 0%, transparent 70%);
}

/* Inner glow layer */
.mg-card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: background .3s ease;
}

/* Body layout */
.mg-card-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5, 20px) var(--sp-5, 20px);
  min-height: 180px;
}
.mg-card-left {
  display: flex;
  align-items: center;
  gap: var(--sp-4, 16px);
  flex: 1;
  min-width: 0;
}
.mg-card-icon {
  font-size: 2.2rem;
  flex-shrink: 0;
  line-height: 1;
}
.mg-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.mg-card-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text);
}
.mg-card-gold .mg-card-title { color: var(--gold-bright); }
.mg-card-teal .mg-card-title { color: var(--teal-bright); }

.mg-card-sub {
  font-size: 0.78rem;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.mg-card-right {
  flex-shrink: 0;
  margin-left: var(--sp-3, 12px);
}

/* SVG ring */
.mg-ring { display: block; }

/* Player badges */
.mg-badges {
  display: flex;
  gap: var(--sp-2, 8px);
  margin-top: 6px;
  flex-wrap: wrap;
}
.mg-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-xs, 5px);
  font-size: 0.68rem;
  font-weight: 600;
  background: var(--bg-raised);
  border: 1px solid var(--border);
}
.mg-badge-p1 { border-color: rgba(212,168,67,0.15); }
.mg-badge-p2 { border-color: rgba(34,211,187,0.15); }
.mg-badge-name { color: var(--text-2); }
.mg-badge-pct { font-family: var(--font-mono); font-weight: 800; }

/* Responsive */
@media (max-width: 480px) {
  .mg-card-body { padding: var(--sp-4, 16px); min-height: 150px; }
  .mg-card-icon { font-size: 1.6rem; }
  .mg-card-title { font-size: 1rem; }
}
`;
  document.head.appendChild(s);
}
