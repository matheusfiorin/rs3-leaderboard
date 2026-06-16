import { SectionHead } from "@/components/primitives";
import LiveClient from "./LiveClient";
import { loadTrackedPlayers, PLAYERS } from "@/lib/data";

export const dynamic = "force-static";

export default async function LivePage() {
  const players = await loadTrackedPlayers();
  return (
    <div className="space-y-6">
      <SectionHead title="Live" hint="XP ticker · polled every 30 s" />
      <LiveClient
        players={players.map((p) => ({
          slug: p.slug,
          name: p.name,
          accent: PLAYERS.find((x) => x.slug === p.slug)?.accent ?? "prayer",
          totalXp: p.totalXp,
        }))}
      />
    </div>
  );
}
