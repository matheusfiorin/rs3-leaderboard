import type { Metadata } from "next";
import LookupClient from "./LookupClient";

export const metadata: Metadata = { title: "Lookup — Sexta Era" };

export default function LookupPage() {
  return <LookupClient />;
}
