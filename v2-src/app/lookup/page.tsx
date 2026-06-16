import { Card, SectionHead } from "@/components/primitives";
import LookupClient from "./LookupClient";

export const dynamic = "force-static";

export default function LookupPage() {
  return (
    <div className="space-y-6">
      <SectionHead title="Lookup" hint="Any RuneScape 3 player by RSN" />
      <LookupClient />
      <Card className="p-4 text-xs text-ink-3 leading-relaxed">
        <p>
          Lookup hits the public RuneMetrics + Hiscores endpoints via CORS proxies.
          Privacy-locked accounts and unranked players will fail silently.
        </p>
      </Card>
    </div>
  );
}
