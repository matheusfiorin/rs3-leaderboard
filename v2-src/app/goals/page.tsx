import type { Metadata } from "next";
import GoalsClient from "./GoalsClient";

export const metadata: Metadata = { title: "Goals — Sexta Era" };

export default function GoalsPage() {
  return <GoalsClient />;
}
