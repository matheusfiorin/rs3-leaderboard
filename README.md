# Sexta Era

A co-op RuneScape 3 tracker for **Decxus** & **Soclopata** — two players working
through Gielinor together. Honours **Fiorovizk** (retired 2026-05-21) in the
In Memoriam archive.

**Live:** https://matheusfiorin.github.io/rs3-leaderboard/

## What it tracks

| Area | What you get |
|---|---|
| **Dashboard** | Head-to-head comparison, war-room player cards, and the nearest actionable unlocks for each player |
| **Skills** | All 29 skills compared, plus training methods with xp/hr and time-to-level, plus revolution bars and DPS per combat style |
| **Quests** | 363 quests merged across both players, with a "do next" list of what one has done and the other hasn't |
| **Goals** | Major campaign chains — Senntisten, Prifddinas, The World Wakes, Invention, Ritual of the Mahjarrat, Sliske's Endgame |
| **PvM** | Boss ladder from Giant Mole to Zuk, gated by real requirements, with kill counts you log yourself |
| **Dungeons** | Elite Dungeons, raids, and the Necromancy 1–120 unlock ladder |
| **Gear** | T70→T95 progression per style, upgrade paths, and Invention perk targets |
| **Capes** | Skill capes, master capes, Quest/Master Quest, Max, Completionist and Trimmed |
| **GP** | Money-making methods priced against live Grand Exchange data |
| **Live** | 30-second XP ticker with session delta and xp/hour |
| **Lookup** | Look up any RSN |

## Architecture

Static Next.js export served by GitHub Pages from `master:/docs`.

```
data/                RuneMetrics + hiscore + GE cache, refreshed by cron
v2-src/              the application source
  app/               routes (App Router, one thin server page + a client component each)
  components/        shell, providers, design primitives
  lib/
    content/         the RS3 content database — bosses, capes, gear, dungeons,
                     goals, money, combat, training
    requirements.ts  one evaluator for every gated thing in the app
  scripts/           data sync, content validation, publish
docs/                build output — what Pages actually serves
```

### The requirement model

Everything gated — a boss, a cape, a gear tier, a campaign goal — declares its
entry conditions as a `Requirement[]`:

```ts
{ kind: "skill",  skill: 20, level: 90 }
{ kind: "quest",  title: "Plague's End" }
{ kind: "stat",   stat: "combatLevel", value: 110 }
{ kind: "kc",     boss: "Vorago", count: 50 }
{ kind: "manual", id: "learned-rotation", label: "Learned the rotation" }
```

One evaluator (`lib/requirements.ts`) scores them all, so any new content module
gets progress rings, gap lists and "closest unlock" ranking for free.

### Data freshness

The site is a static export, but the data is not baked into it. A GitHub Action
refreshes `data/*.json` every 30 minutes and mirrors it into `docs/data/`. The
client re-reads those files on load, on tab focus, and every 5 minutes — so the
published site stays current without a rebuild.

Build-time data is still server-rendered for an instant first paint; the client
just swaps in anything newer.

### Manual progress and cross-device sync

Boss kill counts and checklist items are things no RuneScape API exposes, so the
app stores them itself:

- **Local** — `localStorage`, always on, works offline.
- **Synced** — optional. Link devices with a sync code and every write pushes,
  every focus pulls. Merge is per-key last-write-wins, so two devices editing
  different items both keep their edits.

Cloud sync needs `NEXT_PUBLIC_SYNC_URL` and `NEXT_PUBLIC_SYNC_KEY` at build time
(a Supabase project and its anon key). Without them the app runs local-only and
offers JSON export/import instead. See **Sync** in the app.

## Development

```bash
cd v2-src
npm install
npm run dev          # http://localhost:3000/rs3-leaderboard
```

Other commands:

```bash
npm run check        # typecheck + lint + content validation
npm run build        # static export -> repo-root docs/
```

From the repo root, to serve and inspect the production build exactly as Pages
does:

```bash
node scripts/serve-docs.mjs        # http://localhost:4173/rs3-leaderboard/
```

### Content validation

`npm run validate` catches the two bug classes types cannot:

1. A quest requirement whose title doesn't match RuneMetrics exactly — including
   the ` (miniquest)` suffix on the 49 miniquests it tracks — can never be
   satisfied, so the goal sits at 99% forever.
2. A money recipe referencing an item id absent from the GE cache silently
   prices it at zero and corrupts the profit figure.

It runs automatically before every build.

## License

MIT
