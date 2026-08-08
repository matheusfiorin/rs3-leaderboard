import type { Metadata } from "next";
import GearClient from "./GearClient";

export const dynamic = "force-static";

export const metadata: Metadata = { title: "Gear — Sexta Era" };

export default function GearPage() {
  return <GearClient />;
}
