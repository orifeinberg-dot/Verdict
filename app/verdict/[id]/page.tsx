"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { reportStore } from "@/lib/report-store";
import type { StoredReport } from "@/lib/report-store/types";
import { AnnotatedImage } from "@/components/annotated-image";
import { VerdictReport } from "@/components/verdict-report";

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

  // Two pieces of state, not one: hover previews the sync without
  // "committing" a selection (desktop only — there is no hover on touch),
  // while a click/tap toggles a persistent selection. See UI_SPEC.md's
  // note that this sync is the one piece of interaction worth getting
  // right.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = hoveredId ?? selectedId;
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  // Scrolling only ever follows the side the user just interacted with —
  // a marker tap reveals the matching row, a row tap reveals the image —
  // so the two calls never fight over which target wins. Hover never
  // scrolls at all, on either side.
  function selectMarker(pointId: string) {
    const isDeselecting = selectedId === pointId;
    setSelectedId(isDeselecting ? null : pointId);
    if (isDeselecting) return;
    // On mobile, "nearest" lands the row right at the viewport edge —
    // centering it reads as a comfortable landing spot instead. Desktop's
    // two-column layout already keeps the row comfortably placed, so it
    // keeps the original minimal-scroll behavior.
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    document.getElementById(`point-${pointId}`)?.scrollIntoView({
      behavior: "smooth",
      block: isMobile ? "center" : "nearest",
    });
  }

  function selectFinding(pointId: string) {
    const isDeselecting = selectedId === pointId;
    setSelectedId(isDeselecting ? null : pointId);
    if (isDeselecting) return;
    imageWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

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
    <main className="flex flex-1 flex-col px-6 py-12 sm:px-12 md:py-16">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-2 md:items-start md:gap-14">
        <div ref={imageWrapperRef} className="md:sticky md:top-12">
          <AnnotatedImage
            image={image}
            strengths={report.strengths}
            weaknesses={report.weaknesses}
            activeId={activeId}
            onHover={setHoveredId}
            onSelect={selectMarker}
          />
        </div>
        <VerdictReport
          report={report}
          context={context}
          activeId={activeId}
          onHover={setHoveredId}
          onSelect={selectFinding}
        />
      </div>
    </main>
  );
}
