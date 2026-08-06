import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { PlayerDataProvider } from "@/components/PlayerDataProvider";
import { ProgressProvider } from "@/components/ProgressProvider";
import { loadMeta, loadTrackedSummaries } from "@/lib/data";

const fontDisplay = Fraunces({
  variable: "--font-display-family",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const fontSans = Inter({
  variable: "--font-sans-family",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sexta Era — Sixth Age tracker",
  description:
    "Live RuneScape 3 tracker for Decxus & Soclopata. Skills, quests, GP, PvM and endgame goals — every XP tick of the Sixth Age.",
};

export const viewport: Viewport = {
  themeColor: "#06080F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Build-time snapshot for instant first paint. PlayerDataProvider re-reads
  // the same JSON on the client so the 30-minute cron shows up without a
  // rebuild.
  const [players, meta] = await Promise.all([
    loadTrackedSummaries(),
    loadMeta(),
  ]);

  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ProgressProvider>
          <PlayerDataProvider initialPlayers={players} initialMeta={meta}>
            <AppShell>{children}</AppShell>
          </PlayerDataProvider>
        </ProgressProvider>
      </body>
    </html>
  );
}
