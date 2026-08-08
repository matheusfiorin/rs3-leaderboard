import type { Metadata } from "next";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { loadGePrices } from "@/lib/data";
import MoneyClient from "./MoneyClient";

export const metadata: Metadata = { title: "GP — Sexta Era" };

export const dynamic = "force-static";

/**
 * When was the committed price cache last written?
 *
 * On a static export this resolves to the build time, which is the honest
 * answer for the bytes in the prerendered HTML. The client refetch replaces it
 * with the file's real Last-Modified as soon as that lands, so a cron push that
 * skipped a rebuild still reports its own age rather than the build's.
 */
async function priceFileMtime(): Promise<string | null> {
  try {
    const s = await stat(join(process.cwd(), "public", "data", "ge_prices.json"));
    return s.mtime.toISOString();
  } catch {
    return null;
  }
}

/**
 * ge_prices.json is a committed build artefact of ~5 KB / 100 items, so the
 * whole price table rides in the prerendered HTML. Before this the route
 * fetched it from the client and shipped 284 visible characters — every rate,
 * card and receipt waited on the full JS bundle plus a round trip, which is
 * why /money had one of the worst LCPs on the site. MoneyClient keeps the
 * fetch, demoted to a refresh path.
 */
export default async function MoneyPage() {
  const [prices, pricedAt] = await Promise.all([loadGePrices(), priceFileMtime()]);
  return <MoneyClient initialPrices={prices} initialPricedAt={pricedAt} />;
}
