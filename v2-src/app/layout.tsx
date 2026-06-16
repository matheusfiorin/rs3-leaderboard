import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

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
    "Live RuneScape 3 leaderboard for Decxus & Soclopata. Skills, quests, GP, head-to-head — every XP tick of the Sixth Age.",
};

export const viewport: Viewport = { themeColor: "#06080F" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}
    >
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
