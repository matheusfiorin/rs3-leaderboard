import { Bar, Card, Pill, SectionHead } from "@/components/primitives";
import { loadTrackedPlayers, PLAYERS, questDoneIndex } from "@/lib/data";
import { SKILLS } from "@/lib/skills";
import type { Player } from "@/lib/types";

export const dynamic = "force-static";

type Goal = {
  id: string;
  label: string;
  sub: string;
  tier: "early" | "mid" | "end";
  accent: "soul" | "prayer" | "ash";
  capstone?: string;
  skills: { id: number; required: number; reason: string }[];
  quests: string[];
};

const GOALS: Goal[] = [
  {
    id: "senntisten",
    label: "Road to Soul Split",
    sub: "Unlock Ancient Curses · The Temple at Senntisten",
    tier: "mid",
    accent: "soul",
    capstone: "The Temple at Senntisten",
    skills: [
      { id: 5,  required: 92, reason: "Soul Split ability" },
      { id: 5,  required: 50, reason: "Quest requirement" },
      { id: 13, required: 65, reason: "Devious Minds" },
      { id: 6,  required: 59, reason: "Family Crest" },
    ],
    quests: ["Desert Treasure", "Devious Minds", "Defender of Varrock", "The Curse of Arrav", "The Temple at Senntisten"],
  },
  {
    id: "prifddinas",
    label: "Road to Prifddinas",
    sub: "Plague's End · the elf city",
    tier: "mid",
    accent: "prayer",
    capstone: "Plague's End",
    skills: [
      { id: 16, required: 80, reason: "Plague's End" },
      { id: 12, required: 75, reason: "Plague's End" },
      { id: 22, required: 75, reason: "Plague's End" },
      { id: 24, required: 75, reason: "Plague's End" },
    ],
    quests: ["Underground Pass", "Regicide", "Mourning's End Part I", "Mourning's End Part II", "Within the Light", "Plague's End"],
  },
  {
    id: "worldwakes",
    label: "The World Wakes",
    sub: "Unlock Sunshine & Death's Swiftness",
    tier: "mid",
    accent: "prayer",
    capstone: "The World Wakes",
    skills: [
      { id: 6, required: 76, reason: "Sunshine" },
      { id: 4, required: 76, reason: "Death's Swiftness" },
    ],
    quests: ["The World Wakes"],
  },
  {
    id: "rotm",
    label: "Ritual of the Mahjarrat",
    sub: "Sixth Age capstone — pre-Endgame",
    tier: "end",
    accent: "soul",
    capstone: "Ritual of the Mahjarrat",
    skills: [
      { id: 16, required: 77, reason: "ROTM" },
      { id: 12, required: 76, reason: "ROTM" },
      { id: 5,  required: 50, reason: "Temple at Senntisten" },
    ],
    quests: ["The Temple at Senntisten", "While Guthix Sleeps", "Ritual of the Mahjarrat"],
  },
  {
    id: "sliske",
    label: "Sliske's Endgame",
    sub: "Mahjarrat arc capstone",
    tier: "end",
    accent: "ash",
    capstone: "Sliske's Endgame",
    skills: [
      { id: 5, required: 80, reason: "The Light Within" },
      { id: 12, required: 80, reason: "Children of Mah" },
      { id: 6, required: 79, reason: "Fate of the Gods" },
    ],
    quests: ["Fate of the Gods", "Children of Mah", "The Light Within", "Sliske's Endgame"],
  },
  {
    id: "necromancy",
    label: "Necromancy 99",
    sub: "Mastery of the new combat style",
    tier: "end",
    accent: "ash",
    skills: [{ id: 28, required: 99, reason: "Necromancy 99" }],
    quests: [],
  },
];

export default async function GoalsPage() {
  const players = await loadTrackedPlayers();
  return (
    <div className="space-y-6">
      <SectionHead title="Goals" hint="Active campaigns in flight" />
      <div className="grid gap-4 md:grid-cols-2">
        {GOALS.map((g) => (
          <GoalCard key={g.id} goal={g} players={players} />
        ))}
      </div>
    </div>
  );
}

function GoalCard({ goal, players }: { goal: Goal; players: Player[] }) {
  return (
    <Card accent={goal.accent} className="p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="font-display italic text-xl tracking-tight text-ink">
          {goal.label}
        </h3>
        <Pill tone={goal.accent}>{goal.tier === "early" ? "Early" : goal.tier === "mid" ? "Mid" : "End"}</Pill>
      </div>
      <p className="text-xs text-ink-3 font-mono uppercase tracking-[0.12em] mb-4">
        {goal.sub}
      </p>
      <div className="space-y-3">
        {players.map((p) => {
          const accent: "soul" | "prayer" = PLAYERS.find((x) => x.slug === p.slug)?.accent ?? "prayer";
          const skillsDone = goal.skills.filter((s) => (p.skills[s.id]?.level ?? 1) >= s.required).length;
          const done = questDoneIndex(p);
          const questsDone = goal.quests.filter((q) => done.has(q)).length;
          const capstoneDone = goal.capstone ? done.has(goal.capstone) : false;
          const total = goal.skills.length + goal.quests.length;
          const completed = capstoneDone ? total : skillsDone + questsDone;
          const pct = total > 0 ? Math.round((completed / total) * 100) : capstoneDone ? 100 : 0;
          return (
            <div key={p.slug}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className={`font-mono text-[10.5px] uppercase tracking-wider ${accent === "soul" ? "text-soul-bright" : "text-prayer-bright"}`}>
                  {p.name}
                </span>
                <span className="font-mono tabular text-sm text-ink-2">{pct}%</span>
              </div>
              <Bar pct={pct} accent={accent} />
              <div className="mt-1.5 text-[11px] text-ink-3 font-mono">
                {skillsDone}/{goal.skills.length} skills · {questsDone}/{goal.quests.length} quests
                {capstoneDone && " · capstone ✓"}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
