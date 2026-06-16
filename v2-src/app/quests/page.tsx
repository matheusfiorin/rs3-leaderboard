import { Card, Pill, SectionHead, Stat } from "@/components/primitives";
import { compareQuests, loadTrackedPlayers, PLAYERS, questDoneIndex } from "@/lib/data";
import QuestsExplorer from "./QuestsExplorer";

export const dynamic = "force-static";

export default async function QuestsPage() {
  const players = await loadTrackedPlayers();
  if (players.length < 2) {
    return <p className="text-ink-2">Need both players to render quest compare.</p>;
  }
  const [p1, p2] = players;
  const compare = compareQuests(p1, p2);
  // Build a flat row list with status per player for the client list.
  const d1 = questDoneIndex(p1);
  const d2 = questDoneIndex(p2);
  const all = new Map<string, { title: string; difficulty: number; members: boolean; questPoints: number; a: boolean; b: boolean }>();
  for (const q of p1.questList) {
    all.set(q.title, { title: q.title, difficulty: q.difficulty, members: q.members, questPoints: q.questPoints, a: d1.has(q.title), b: d2.has(q.title) });
  }
  for (const q of p2.questList) {
    if (!all.has(q.title)) {
      all.set(q.title, { title: q.title, difficulty: q.difficulty, members: q.members, questPoints: q.questPoints, a: d1.has(q.title), b: d2.has(q.title) });
    }
  }
  const rows = Array.from(all.values()).sort((x, y) => x.title.localeCompare(y.title));

  return (
    <div className="space-y-6">
      <SectionHead title="Quests" hint={`${rows.length} tracked`} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Both done" value={`${compare.bothDone.length}`} accent="ash" />
        <Stat label="One done" value={`${compare.oneDone.length}`} accent="prayer" />
        <Stat label="Neither" value={`${compare.neither.length}`} />
        <Stat label="Total" value={`${rows.length}`} />
      </div>
      <QuestsExplorer rows={rows} p1Name={p1.name} p2Name={p2.name} />
    </div>
  );
}
