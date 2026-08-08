import type { Metadata } from "next";
import DungeonsClient from "./DungeonsClient";

export const metadata: Metadata = { title: "Dungeons — Sexta Era" };

export default function DungeonsPage() {
  return <DungeonsClient />;
}
