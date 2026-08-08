import type { Metadata } from "next";
import SkillsClient from "./SkillsClient";

export const metadata: Metadata = { title: "Skills — Sexta Era" };

export default function SkillsPage() {
  return <SkillsClient />;
}
