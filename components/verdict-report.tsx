"use client";

import Link from "next/link";
import { useState } from "react";
import type { VerdictReport as VerdictReportData } from "@/lib/verdict/types";
import type { StoredCreativeContext } from "@/lib/report-store/types";
import { VerdictBadge } from "./verdict-badge";
import { ConfidenceScore } from "./confidence-score";
import { CampaignContextSummary, buildContextItems } from "./campaign-context-summary";
import { StrengthsList, WeaknessesList } from "./annotation-list";
import { RecommendationsList } from "./recommendations-list";

const VERDICT_LABEL: Record<VerdictReportData["verdict"], string> = {
  launch: "Launch",
  test: "Test",
  dont_launch: "Don't Launch",
};

function buildSummaryText(report: VerdictReportData, context: StoredCreativeContext): string {
  const lines = [
    `Verdict: ${VERDICT_LABEL[report.verdict]} (${report.confidence}% confidence)`,
    "",
    report.executiveSummary,
  ];

  const contextItems = buildContextItems(context);
  if (contextItems.length > 0) {
    lines.push("", "Campaign context:");
    for (const { label, value } of contextItems) lines.push(`- ${label}: ${value}`);
  }

  if (report.recommendations.length > 0) {
    lines.push("", "Recommendations:");
    for (const item of report.recommendations) lines.push(`- ${item}`);
  }

  return lines.join("\n");
}

type Props = {
  report: VerdictReportData;
  context: StoredCreativeContext;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

export function VerdictReport({ report, context, activeId, onHover, onSelect }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(buildSummaryText(report, context));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <VerdictBadge verdict={report.verdict} />
        <ConfidenceScore confidence={report.confidence} />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-lg text-foreground/80">{report.executiveSummary}</p>
        <CampaignContextSummary context={context} />
      </div>

      <StrengthsList
        points={report.strengths}
        activeId={activeId}
        onHover={onHover}
        onSelect={onSelect}
      />
      <WeaknessesList
        points={report.weaknesses}
        activeId={activeId}
        onHover={onHover}
        onSelect={onSelect}
      />
      <RecommendationsList items={report.recommendations} />

      <div className="flex flex-col gap-4 border-t border-foreground/10 pt-6 md:flex-row md:gap-3">
        <Link
          href="/analyze"
          className="inline-flex h-14 items-center justify-center rounded-full bg-accent px-6 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:h-11 md:flex-1"
        >
          Analyze another creative
        </Link>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-14 items-center justify-center rounded-full border border-foreground/15 px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:h-11 md:flex-1"
        >
          {copied ? "Copied!" : "Copy summary"}
        </button>
      </div>
    </div>
  );
}
