import type { Metadata } from "next";
import LiveClient from "./LiveClient";

export const metadata: Metadata = { title: "Live — Sexta Era" };

export default function LivePage() {
  return <LiveClient />;
}
