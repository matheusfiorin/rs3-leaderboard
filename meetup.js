/* =============================================
   RS3 Leaderboard — Meetup / Encontros + Charts
   ============================================= */

const MEETUPS = [
  {
    id: "2026-04-01",
    date: "2026-04-01",
    duration: "3h",
    title: {
      pt: "Primeiro de Abril em Gielinor",
      en: "April Fools in Gielinor",
    },
    subtitle: {
      pt: "Preparacao + Kalaboss em Daemonheim",
      en: "Preparation + Kalaboss in Daemonheim",
    },
    status: "done",
    blocks: [
      {
        time: "0:00 - 0:30",
        icon: "\u2692",
        title: {
          pt: "Prepara\u00e7\u00e3o \u2014 Equipamento & Suprimentos",
          en: "Preparation \u2014 Gear & Supplies",
        },
        desc: {
          pt: "Ambos compraram suprimentos e prepararam equipamento no GE pro Dungeoneering. Decxus fez Metalurgia (35\u219236) e treinou Condi\u00e7\u00e3o F\u00edsica (42\u219243).",
          en: "Both bought supplies and prepared gear at GE for Dungeoneering. Decxus did Smithing (35\u219236) and trained HP (42\u219243).",
        },
        tips: {
          pt: [
            "Decxus: Metalurgia 35\u219236, CF 42\u219243",
            "Compraram comida e runas pro DG",
          ],
          en: [
            "Decxus: Smithing 35\u219236, HP 42\u219243",
            "Bought food and runes for DG",
          ],
        },
        rewards: {
          pt: "Equipamento preparado, suprimentos prontos",
          en: "Gear ready, supplies stocked",
        },
        done: true,
      },
      {
        time: "0:30 - 3:00",
        icon: "\uD83C\uDFF0",
        title: {
          pt: "Kalaboss — Dungeoneering Duo",
          en: "Kalaboss — Dungeoneering Duo",
        },
        desc: {
          pt: "2 horas e meia de Dungeoneering em dupla! Fizeram andares juntos em Daemonheim, enfrentaram bosses, e subiram bastante. Decxus alcanou os andares 9, 10 e 11. Ambos mataram 4 bosses. XP de combate veio naturalmente dos monstros dentro das dungeons.",
          en: "2.5 hours of Dungeoneering duo! Cleared floors together in Daemonheim, fought bosses, and leveled up a lot. Decxus reached floors 9, 10, and 11. Both killed 4 bosses. Combat XP came naturally from dungeon monsters.",
        },
        tips: {
          pt: [
            "Fiorovizk: DG 32\u219236, DEF 60\u219261, HP 55\u219257, ATK 37\u219238, STR 40\u219241",
            "Decxus: DG 23\u219232 (+9 niveis!), ATK 31\u219232, STR 31\u219232",
            "Ambos mataram 4 bosses em Daemonheim",
            "Decxus alcancou andares 9, 10 e 11 pela primeira vez",
          ],
          en: [
            "Fiorovizk: DG 32\u219236, DEF 60\u219261, HP 55\u219257, ATK 37\u219238, STR 40\u219241",
            "Decxus: DG 23\u219232 (+9 levels!), ATK 31\u219232, STR 31\u219232",
            'Both: "I killed 4 boss monsters in Daemonheim"',
            "Decxus reached floors 9, 10, and 11 for the first time",
          ],
        },
        rewards: {
          pt: "XP de DG, tokens de DG, XP de combate, kills de bosses",
          en: "DG XP, DG tokens, combat XP, boss kills",
        },
        done: true,
      },
    ],
    summary: {
      pt: {
        questsTarget: [],
        xpExpected:
          "Fiorovizk: +89K XP (11 niveis) | Decxus: +30K XP (18 niveis)",
        gpExpected:
          "Loot de Dungeoneering + min\u00e9rios da minera\u00e7\u00e3o",
        funFactor: "Kalaboss duo por 2h30, 4 bosses cada, Decxus andares 9-11",
      },
      en: {
        questsTarget: [],
        xpExpected:
          "Fiorovizk: +89K XP (11 levels) | Decxus: +30K XP (18 levels)",
        gpExpected: "Dungeoneering loot + mining ores",
        funFactor:
          "Kalaboss duo for 2h30, 4 boss kills each, Decxus floors 9-11",
      },
    },
  },
];

// ---- Session data for charts ----
let sessionsData = [];

async function loadSessions() {
  try {
    sessionsData = await cacheFetch("data/sessions.json");
  } catch (_) {
    sessionsData = [];
  }
}

// ---- Chart colors ----
const CHART_P1 = "rgba(212, 168, 67, 0.85)";
const CHART_P1_BG = "rgba(212, 168, 67, 0.15)";
const CHART_P2 = "rgba(34, 211, 187, 0.85)";
const CHART_P2_BG = "rgba(34, 211, 187, 0.15)";
const CHART_GRID = "rgba(255,255,255,0.04)";
const CHART_TEXT = "#9e9eb0";

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: CHART_TEXT,
        font: { family: "'DM Sans',sans-serif", size: 11 },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: CHART_TEXT, font: { size: 10 } },
      grid: { color: CHART_GRID },
    },
    y: {
      ticks: {
        color: CHART_TEXT,
        font: { family: "'JetBrains Mono',monospace", size: 10 },
        callback: (v) => (v >= 1000 ? (v / 1000).toFixed(0) + "K" : v),
      },
      grid: { color: CHART_GRID },
    },
  },
};

// Chart instance registry (destroy before recreating)
const chartInstances = {};
function makeChart(canvasId, config) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

function aggregateSkillGains(p1, p2, minTotal = 50) {
  const allSkills = new Set([
    ...Object.keys(p1.gains),
    ...Object.keys(p2.gains),
  ]);
  return Array.from(allSkills)
    .map((sk) => ({
      skill: sk,
      p1: (p1.gains[sk] || {}).xp || 0,
      p2: (p2.gains[sk] || {}).xp || 0,
      total: ((p1.gains[sk] || {}).xp || 0) + ((p2.gains[sk] || {}).xp || 0),
    }))
    .filter((s) => s.total > minTotal)
    .sort((a, b) => b.total - a.total);
}

// ---- Render overview gains chart ----
function renderOverviewGainsChart() {
  if (!sessionsData.length) {
    const el = document.getElementById("overview-gains-chart");
    if (el)
      el.parentElement.innerHTML =
        '<div class="chart-empty">' +
        (currentLang === "pt"
          ? "Graficos disponiveis apos o primeiro encontro registrado"
          : "Charts available after the first recorded meetup") +
        "</div>";
    return;
  }
  const session = sessionsData[sessionsData.length - 1]; // most recent
  const players = Object.keys(session.players);
  if (players.length < 2) return;

  const p1 = session.players[players[0]];
  const p2 = session.players[players[1]];

  // Get top skills by combined XP gain
  const skillArr = aggregateSkillGains(p1, p2, 100).slice(0, 10);

  makeChart("overview-gains-chart", {
    type: "bar",
    data: {
      labels: skillArr.map((s) => s.skill),
      datasets: [
        {
          label: players[0],
          data: skillArr.map((s) => s.p1),
          backgroundColor: CHART_P1,
          borderRadius: 4,
        },
        {
          label: players[1],
          data: skillArr.map((s) => s.p2),
          backgroundColor: CHART_P2,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        title: {
          display: true,
          text:
            currentLang === "pt"
              ? "XP Ganho por Habilidade (Sessao Mais Recente)"
              : "XP Gained per Skill (Most Recent Session)",
          color: "#eae8e4",
          font: { family: "'DM Sans',sans-serif", size: 13, weight: 700 },
        },
      },
    },
  });
}

// ---- Render meetup charts ----
function renderMeetupCharts(container, session) {
  if (!session) return;
  const players = Object.keys(session.players);
  if (players.length < 2) return;
  const p1 = session.players[players[0]];
  const p2 = session.players[players[1]];

  // Create chart canvases
  const chartHTML = `
    <div class="chart-pair">
      <div class="chart-container"><canvas id="meetup-xp-chart"></canvas></div>
      <div class="chart-container"><canvas id="meetup-levels-chart"></canvas></div>
    </div>
    <div class="chart-container" style="margin-top:var(--sp-3)"><canvas id="meetup-skills-chart"></canvas></div>
  `;
  container.insertAdjacentHTML("beforeend", chartHTML);

  // Total XP comparison (doughnut)
  makeChart("meetup-xp-chart", {
    type: "doughnut",
    data: {
      labels: players,
      datasets: [
        {
          data: [p1.totalXpGain, p2.totalXpGain],
          backgroundColor: [CHART_P1, CHART_P2],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: CHART_TEXT,
            font: { family: "'DM Sans',sans-serif", size: 11 },
          },
        },
        title: {
          display: true,
          text: currentLang === "pt" ? "XP Total Ganho" : "Total XP Gained",
          color: "#eae8e4",
          font: { family: "'DM Sans',sans-serif", size: 13, weight: 700 },
        },
      },
    },
  });

  // Level gains (bar)
  makeChart("meetup-levels-chart", {
    type: "bar",
    data: {
      labels: players,
      datasets: [
        {
          label: currentLang === "pt" ? "Niveis Ganhos" : "Levels Gained",
          data: [p1.levelGain, p2.levelGain],
          backgroundColor: [CHART_P1, CHART_P2],
          borderRadius: 6,
        },
      ],
    },
    options: {
      ...chartDefaults,
      indexAxis: "y",
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: false },
        title: {
          display: true,
          text:
            currentLang === "pt"
              ? "Niveis Totais Ganhos"
              : "Total Levels Gained",
          color: "#eae8e4",
          font: { family: "'DM Sans',sans-serif", size: 13, weight: 700 },
        },
      },
    },
  });

  // Per-skill XP (horizontal bar)
  const skillArr = aggregateSkillGains(p1, p2, 50);

  makeChart("meetup-skills-chart", {
    type: "bar",
    data: {
      labels: skillArr.map((s) => s.skill),
      datasets: [
        {
          label: players[0],
          data: skillArr.map((s) => s.p1),
          backgroundColor: CHART_P1,
          borderRadius: 3,
        },
        {
          label: players[1],
          data: skillArr.map((s) => s.p2),
          backgroundColor: CHART_P2,
          borderRadius: 3,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        title: {
          display: true,
          text:
            currentLang === "pt"
              ? "XP Ganho por Habilidade"
              : "XP Gained per Skill",
          color: "#eae8e4",
          font: { family: "'DM Sans',sans-serif", size: 13, weight: 700 },
        },
      },
    },
  });
}

// ---- Render meetup page ----
function renderMeetup() {
  const lang = currentLang;
  const el = document.querySelector("#meetup-content");
  if (!el) return;

  const meetup = MEETUPS[0];
  if (!meetup) {
    el.innerHTML =
      '<div class="chart-empty">' +
      (lang === "pt" ? "Nenhum encontro planejado." : "No meetups planned.") +
      "</div>";
    return;
  }

  const m = meetup;
  const saved = JSON.parse(localStorage.getItem("rs3lb-meetup") || "{}");

  el.innerHTML = `
    <div class="meetup-hero">
      <div class="meetup-hero-emoji">\uD83E\uDD1D</div>
      <h2 class="meetup-hero-title">${m.title[lang] || m.title.en}</h2>
      <p class="meetup-hero-sub">${m.date} \u00b7 ${m.duration} \u00b7 ${m.subtitle[lang] || m.subtitle.en}</p>
      ${m.status === "done" ? `<div style="margin-top:8px;display:inline-block;padding:3px 14px;border-radius:100px;background:var(--green-bg);color:var(--green);font-size:0.7rem;font-weight:700;border:1px solid rgba(52,211,153,0.15)">${lang === "pt" ? "\u2713 Concluido" : "\u2713 Completed"}</div>` : ""}
    </div>

    <div class="meetup-timeline">
      ${m.blocks
        .map((b, i) => {
          const key = `${m.id}_${i}`;
          const done = b.done || saved[key];
          return `
          <div class="meetup-block ${done ? "done" : ""}">
            <div class="meetup-block-sidebar">
              <div class="meetup-block-dot ${done ? "done" : ""}">${done ? "\u2713" : i + 1}</div>
              ${i < m.blocks.length - 1 ? '<div class="meetup-block-line"></div>' : ""}
            </div>
            <div class="meetup-block-content">
              <div class="meetup-block-header">
                <div>
                  <div class="meetup-block-time">${b.time}</div>
                  <div class="meetup-block-title">${b.icon} ${b.title[lang] || b.title.en}</div>
                </div>
              </div>
              <p class="meetup-block-desc">${b.desc[lang] || b.desc.en}</p>
              <div class="meetup-block-tips">
                <div class="meetup-tips-title">${lang === "pt" ? "Resultado" : "Result"}:</div>
                <ul>${(b.tips[lang] || b.tips.en).map((t) => `<li>${t}</li>`).join("")}</ul>
              </div>
              <div class="meetup-block-reward"><span class="meetup-reward-icon">\uD83C\uDF81</span>${b.rewards[lang] || b.rewards.en}</div>
            </div>
          </div>`;
        })
        .join("")}
    </div>

    <div class="meetup-summary">
      <h3>${lang === "pt" ? "Resumo da Sessao" : "Session Summary"}</h3>
      <div class="meetup-summary-grid">
        <div class="meetup-summary-item">
          <div class="meetup-summary-label">\u2B50 ${lang === "pt" ? "XP Ganho" : "XP Gained"}</div>
          <div class="meetup-summary-value">${(m.summary[lang] || m.summary.en).xpExpected}</div>
        </div>
        <div class="meetup-summary-item">
          <div class="meetup-summary-label">\uD83D\uDCB0 ${lang === "pt" ? "Loot" : "Loot"}</div>
          <div class="meetup-summary-value">${(m.summary[lang] || m.summary.en).gpExpected}</div>
        </div>
        <div class="meetup-summary-item" style="grid-column:span 2">
          <div class="meetup-summary-label">\uD83C\uDF89 ${lang === "pt" ? "Destaques" : "Highlights"}</div>
          <div class="meetup-summary-value">${(m.summary[lang] || m.summary.en).funFactor}</div>
        </div>
      </div>
    </div>
  `;

  // Render charts below summary
  if (sessionsData.length) {
    const session = sessionsData.find((s) => s.id === m.id) || sessionsData[0];
    renderMeetupCharts(el, session);
  }
}
