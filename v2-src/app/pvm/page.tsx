import type { Metadata } from "next";
import PvmClient from "./PvmClient";

export const metadata: Metadata = { title: "PvM — Sexta Era" };

export const dynamic = "force-static";

export default function PvmPage() {
  return <PvmClient />;
}
