import Link from "next/link";
import { Card, SectionHead } from "@/components/primitives";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-16 space-y-6 text-center">
      <SectionHead title="404" hint="Route not found" />
      <Card className="p-8 space-y-4">
        <p className="text-ink-2 text-sm">
          That page never wrote itself into the Sixth Age.
        </p>
        <Link
          href="/"
          className="inline-block h-10 px-5 rounded-md border border-line text-sm text-ink-2 hover:text-ink hover:border-line-strong transition-colors leading-10"
        >
          Back to dashboard
        </Link>
      </Card>
    </div>
  );
}
