# RS3 Leaderboard

A co-op RuneScape 3 adventure tracker for **Fiorovizk** & **Decxus** — two Brazilian players discovering Gielinor together.

## Features

- **Overview** — Player cards, head-to-head comparison, adventure journal scores
- **Skills** — All 29 RS3 skills compared with XP, levels, and category filters
- **Adventure Journal** — 31 gamified goals worth ~800 points
- **Quests** — Quest completion progress for both players
- **Activity** — Recent activity feed from RuneMetrics API
- **Combat & Revolution** — Recommended revolution bars, gear, and DPS estimates per combat style
- **Money Making** — 16 GP methods with live Grand Exchange prices and player eligibility
- **AI Chat** — In-browser assistant powered by Claude Haiku with full player context
- **Meetups** — Session tracking with XP gain charts (Chart.js)
- **Easter Event** — Gielinor Egg Hunt 2026 checklist tracker

## Tech Stack

- **Vanilla JS/HTML/CSS** — zero dependencies, no build step
- **Chart.js** via CDN for data visualization
- **GitHub Actions** — automated data refresh every 30 minutes
- **Bilingual** — Portuguese (PT-BR) and English

## Running Locally

```bash
# Any static server works
python3 -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000`.

## Data Pipeline

Player data is fetched from Jagex APIs (RuneMetrics, Hiscores) and cached in `data/` via GitHub Actions. The frontend uses a cache-first strategy: cached JSON loads instantly, then optionally upgrades from live APIs.

## License

MIT
