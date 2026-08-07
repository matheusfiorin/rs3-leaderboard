import type { Metadata } from "next";
import { SyncPanel } from "@/components/SyncPanel";

export const metadata: Metadata = { title: "Sync — Sexta Era" };

export default function SettingsPage() {
  return <SyncPanel />;
}
