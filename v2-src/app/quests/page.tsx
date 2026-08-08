import type { Metadata } from "next";
import QuestsExplorer from "./QuestsExplorer";

export const metadata: Metadata = { title: "Quests — Sexta Era" };

export default function QuestsPage() {
  return <QuestsExplorer />;
}
