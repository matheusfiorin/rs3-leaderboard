import type { Metadata } from "next";
import CapesClient from "./CapesClient";

export const metadata: Metadata = { title: "Capes — Sexta Era" };

export default function CapesPage() {
  return <CapesClient />;
}
