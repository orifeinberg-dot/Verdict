"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useSyncExternalStore } from "react";
import { reportStore } from "@/lib/report-store";
import type { StoredReport } from "@/lib/report-store/types";

// Development-only rendering for this milestone — plain and readable, not
// the final polished report UI (markers, hotspot sync, etc. come next).
// See DEVELOPMENT_PLAN.md / agents/prompts/008-design-verdict-report.md.

const VERDICT_LABEL: Record<StoredReport["report"]["verdict"], string> = {
  launch: "Launch",
  test: "Test",
  dont_launch: "Don't Launch",
};

const noopSubscribe = () => () => {};

// sessionStorage is browser-only and can't be read during SSR. Reading it
// in an effect+setState would paint the "not available" fallback for one
// frame before correcting itself. useSyncExternalStore (with a null
// server snapshot) avoids that visible flash — React reconciles the real
// client value synchronously right after hydration, before paint.
function useStoredReport(id: string | undefined): StoredReport | null {
  const cache = useRef<{ id: string | undefined; value: StoredReport | null }>(
    { id: undefined, value: null },
  );

  return useSyncExternalStore(
    noopSubscribe,
    () => {
      if (cache.current.id !== id) {
        cache.current = { id, value: id ? reportStore.load(id) : null };
      }
      return cache.current.value;
    },
    () => null,
  );
}

export default function VerdictPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const entry = useStoredReport(id);

  if (!entry) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            This report isn&apos;t available
          </h1>
          <p className="max-w-md text-foreground/70">
            Verdict reports only live in the browser session that generated
            them. If you opened this link in a new session, or it&apos;s
            expired, analyze the creative again to get a fresh report.
          </p>
        </div>
        <Link
          href="/analyze"
          className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Analyze a creative
        </Link>
      </main>
    );
  }

  const { report, image, context } = entry;

  return (
    <main className="flex flex-1 flex-col px-6 py-16 sm:px-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <Link
          href="/analyze"
          className="text-sm text-foreground/60 transition-colors hover:text-foreground"
        >
          ← Analyze another creative
        </Link>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.dataUrl}
          alt="Uploaded creative"
          className="w-full rounded-2xl border border-foreground/10 object-contain"
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium tracking-wide text-foreground/50 uppercase">
            Verdict
          </span>
          <h1 className="text-4xl font-semibold tracking-tight">
            {VERDICT_LABEL[report.verdict]}
          </h1>
          <span className="text-sm text-foreground/60">
            {report.confidence}% confidence
          </span>
        </div>

        <p className="text-lg text-foreground/80">{report.executiveSummary}</p>

        <ReportSection
          title="Strengths"
          items={report.strengths.map((point) => point.summary)}
        />
        <ReportSection
          title="Weaknesses"
          items={report.weaknesses.map((point) => point.summary)}
        />
        <ReportSection title="Recommendations" items={report.recommendations} />

        <div className="flex flex-col gap-1 border-t border-foreground/10 pt-6 text-sm text-foreground/50">
          <span>Brand: {context.brandName}</span>
          <span>Industry: {context.industry}</span>
          <span>Campaign objective: {context.campaignObjective}</span>
        </div>
      </div>
    </main>
  );
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="rounded-lg border border-foreground/10 px-4 py-3 text-sm text-foreground/80"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
