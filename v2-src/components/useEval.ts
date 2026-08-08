"use client";

import { useMemo } from "react";
import { usePlayerData, useQuests } from "@/components/PlayerDataProvider";
import { useProgress } from "@/components/ProgressProvider";
import { questDoneIndex } from "@/lib/player";
import { scopeManual } from "@/lib/progress";
import { evaluate } from "@/lib/requirements";
import type { EvalContext } from "@/lib/requirements";
import type { GateResult, PlayerSummary, Requirement } from "@/lib/types";

/**
 * One place that assembles the three inputs every gated page needs:
 * live player stats, the on-demand quest list, and the cross-device manual
 * store. Pages should never build an EvalContext by hand — doing so is how
 * one page ends up reading stale quests while another reads fresh ones.
 */
export interface EvalBundle {
  players: PlayerSummary[];
  /** EvalContext per player slug. */
  contexts: Record<string, EvalContext>;
  /** True while quest lists are still being fetched. */
  loading: boolean;
  /** Evaluate a requirement set for one player. */
  gate(slug: string, reqs: Requirement[]): GateResult;
}

export function useEval(): EvalBundle {
  const { players } = usePlayerData();
  const slugs = useMemo(() => players.map((p) => p.slug), [players]);
  const { quests, loading } = useQuests(slugs);
  const progress = useProgress();

  const contexts = useMemo(() => {
    const out: Record<string, EvalContext> = {};
    for (const p of players) {
      const list = quests[p.slug] ?? [];
      out[p.slug] = {
        player: p,
        questsDone: questDoneIndex(list),
        // Manual entries are namespaced per player and presented unprefixed, so
        // a requirement written as { kind: "manual", id: "owns-masterwork" }
        // resolves to that player's tick and not the other player's.
        manual: scopeManual(progress.values, p.slug),
        questPoints: list.length
          ? list.reduce(
              (sum, q) => sum + (q.status === "COMPLETED" ? q.questPoints || 0 : 0),
              0,
            )
          : undefined,
      };
    }
    return out;
  }, [players, quests, progress.values]);

  return useMemo(
    () => ({
      players,
      contexts,
      loading,
      gate: (slug, reqs) => {
        const ctx = contexts[slug];
        if (!ctx) {
          return { results: [], met: [], missing: [], pct: 0, complete: false };
        }
        return evaluate(reqs, ctx);
      },
    }),
    [players, contexts, loading],
  );
}

/**
 * Quest-derived quest points, which RuneMetrics does not report directly.
 * Returns 0 until the quest list has loaded.
 */
export function useQuestPoints(slug: string): number {
  const { quests } = useQuests([slug]);
  return useMemo(
    () =>
      (quests[slug] ?? []).reduce(
        (sum, q) => sum + (q.status === "COMPLETED" ? q.questPoints || 0 : 0),
        0,
      ),
    [quests, slug],
  );
}
