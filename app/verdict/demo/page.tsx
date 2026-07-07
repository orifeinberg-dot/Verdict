import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Verdict — Demo",
  description: "A temporary mock Verdict result page.",
};

export default function VerdictDemoPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your Verdict is ready
        </h1>
        <p className="text-foreground/70">
          This is a placeholder result page. Real analysis is coming in a
          future milestone.
        </p>
      </div>
      <Link
        href="/analyze"
        className="text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        ← Back to Analyze
      </Link>
    </main>
  );
}
