import { Card, Pill, SectionHead, Stat } from "@/components/primitives";
import { loadGePrices, loadTrackedPlayers, questDoneIndex } from "@/lib/data";
import { fmtGp } from "@/lib/format";
import { SKILLS } from "@/lib/skills";
import type { Player } from "@/lib/types";

export const dynamic = "force-static";

type Method = {
  id: string;
  name: string;
  cat: "processing" | "afk" | "skilling" | "boss";
  intensity: "low" | "moderate" | "high";
  members: boolean;
  gp: number;
  reqs: Record<number, number>;
  quest?: string;
  wiki: string;
};

const METHODS: Method[] = [
  { id: "abyss-natures", name: "Crafting nature runes (Abyss)", cat: "skilling", intensity: "high",     members: true,  gp: 8_500_000,  reqs: { 20: 77 },                       wiki: "Money_making_guide/Crafting_nature_runes" },
  { id: "abyss-bloods",  name: "Crafting blood runes (Abyss)",  cat: "skilling", intensity: "high",     members: true,  gp: 11_000_000, reqs: { 20: 77, 6: 80 },                wiki: "Money_making_guide/Crafting_blood_runes" },
  { id: "ranarr",        name: "Ranarr potions (unf)",           cat: "processing", intensity: "low",   members: true,  gp: 6_500_000,  reqs: { 15: 25 },                       wiki: "Money_making_guide/Making_ranarr_potions_(unf)" },
  { id: "antipoison",    name: "Super antipoison",               cat: "processing", intensity: "moderate", members: true, gp: 9_500_000, reqs: { 15: 48 },                      wiki: "Money_making_guide/Making_super_antipoisons" },
  { id: "aggression",    name: "Aggression potions",             cat: "processing", intensity: "moderate", members: true, gp: 14_000_000, reqs: { 15: 82 }, quest: "Plague's End", wiki: "Money_making_guide/Making_aggression_potions" },
  { id: "sandstone",     name: "Red Sandstone (Menaphos)",       cat: "afk",        intensity: "low",   members: true,  gp: 3_500_000,  reqs: { 14: 81 },                       wiki: "Red_sandstone" },
  { id: "miscellania",   name: "Throne of Miscellania (daily)",  cat: "afk",        intensity: "low",   members: true,  gp: 250_000,    reqs: {}, quest: "Throne of Miscellania", wiki: "Throne_of_Miscellania" },
  { id: "ports",         name: "Player-Owned Ports (weekly)",    cat: "afk",        intensity: "low",   members: true,  gp: 5_000_000,  reqs: {}, quest: "The Jack of Spades",  wiki: "Player-owned_port" },
  { id: "herb-run",      name: "Herb run (15 patches)",          cat: "afk",        intensity: "low",   members: true,  gp: 1_200_000,  reqs: { 19: 32 },                       wiki: "Herb_run" },
  { id: "rune-shop",     name: "Rune shop run",                  cat: "afk",        intensity: "moderate", members: true, gp: 1_800_000, reqs: {},                              wiki: "Rune_running" },
  { id: "soul-runes",    name: "Soul rune (Senntisten altar)",   cat: "skilling",   intensity: "high",  members: true,  gp: 7_000_000,  reqs: { 20: 90 }, quest: "The Temple at Senntisten", wiki: "Money_making_guide/Crafting_soul_runes" },
  { id: "cinderbane",    name: "Boss · Solak (mid)",             cat: "boss",       intensity: "high",  members: true,  gp: 18_000_000, reqs: { 28: 90, 5: 92 }, quest: "Ritual of the Mahjarrat", wiki: "Solak" },
];

export default async function MoneyPage() {
  const [players, ge] = await Promise.all([loadTrackedPlayers(), loadGePrices()]);
  // Sort by gp desc, gate per player.
  const sorted = [...METHODS].sort((a, b) => b.gp - a.gp);
  return (
    <div className="space-y-8">
      <SectionHead title="GP" hint="Methods · ranked by raw rate" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Methods tracked" value={`${METHODS.length}`} />
        <Stat label="GE items priced" value={`${Object.keys(ge).length}`} />
        <Stat label="Top method" value={fmtGp(sorted[0].gp)} accent="ash" />
        <Stat label="Median method" value={fmtGp(sorted[Math.floor(sorted.length / 2)].gp)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((m) => (
          <MethodCard key={m.id} method={m} players={players} />
        ))}
      </div>
    </div>
  );
}

function MethodCard({ method, players }: { method: Method; players: Player[] }) {
  const reqSummary = Object.entries(method.reqs).map(([id, lvl]) => {
    const sk = SKILLS.find((s) => s.id === Number(id));
    return { name: sk?.key ?? `Skill ${id}`, level: lvl };
  });
  return (
    <Card accent="ash" className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <a
          href={`https://runescape.wiki/w/${encodeURIComponent(method.wiki)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display italic text-lg text-ink hover:text-ash-bright"
        >
          {method.name}
        </a>
        <span className="font-mono tabular text-ash-bright text-base whitespace-nowrap">
          {fmtGp(method.gp)} / h
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill tone={method.intensity === "high" ? "soul" : method.intensity === "low" ? "success" : "warn"}>
          {method.intensity}
        </Pill>
        <Pill>{method.cat}</Pill>
        {!method.members && <Pill tone="success">F2P</Pill>}
        {method.quest && <Pill tone="ash">{method.quest}</Pill>}
      </div>
      {reqSummary.length > 0 && (
        <div className="mt-3 text-xs text-ink-3 font-mono">
          {reqSummary.map((r) => `${r.name} ${r.level}`).join(" · ")}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-line space-y-1">
        {players.map((p) => {
          const accent = p.slug === "decxus" ? "soul" : "prayer";
          const done = questDoneIndex(p);
          const skillMet = Object.entries(method.reqs).every(([id, lvl]) => (p.skills[Number(id)]?.level ?? 1) >= lvl);
          const questMet = !method.quest || done.has(method.quest);
          const ok = skillMet && questMet;
          return (
            <div key={p.slug} className="flex items-center justify-between text-xs">
              <span className={`font-mono ${accent === "soul" ? "text-soul-bright" : "text-prayer-bright"}`}>
                {p.name}
              </span>
              <span className={ok ? "text-success" : "text-ink-faint"}>
                {ok ? "Eligible" : !skillMet ? "Level gap" : "Quest missing"}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
