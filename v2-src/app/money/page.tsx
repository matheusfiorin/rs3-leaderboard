import type { Metadata } from "next";
import MoneyClient from "./MoneyClient";

export const metadata: Metadata = { title: "GP — Sexta Era" };

export const dynamic = "force-static";

export default function MoneyPage() {
  return <MoneyClient />;
}
