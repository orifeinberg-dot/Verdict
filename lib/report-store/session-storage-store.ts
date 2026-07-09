import type {
  AnnotatedPoint,
  AnnotationCategory,
  Verdict,
  Weakness,
} from "@/lib/verdict/types";
import type { ReportStore, StoredReport } from "./types";

const STORAGE_KEY_PREFIX = "verdict-report:";

const VALID_VERDICTS: Verdict[] = ["launch", "test", "dont_launch"];
const VALID_CATEGORIES: AnnotationCategory[] = [
  "policy_risk",
  "legibility",
  "brand_consistency",
  "message_clarity",
];

function isBoundingBox(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const box = value as Record<string, unknown>;
  return (
    typeof box.x === "number" &&
    typeof box.y === "number" &&
    typeof box.width === "number" &&
    typeof box.height === "number"
  );
}

function isAnnotatedPoint(value: unknown): value is AnnotatedPoint {
  if (typeof value !== "object" || value === null) return false;
  const point = value as Record<string, unknown>;
  return (
    typeof point.id === "string" &&
    VALID_CATEGORIES.includes(point.category as AnnotationCategory) &&
    typeof point.summary === "string" &&
    (point.boundingBox === undefined || isBoundingBox(point.boundingBox))
  );
}

function isWeakness(value: unknown): value is Weakness {
  return (
    isAnnotatedPoint(value) &&
    typeof (value as Record<string, unknown>).blocking === "boolean"
  );
}

// Hand-rolled rather than a schema library for this milestone — see
// DEVELOPMENT_PLAN.md, zod is deferred to the OpenAI phase. This is the one
// place stale/malformed data from a previous app version could otherwise
// slip through, so every field is checked before anything is trusted.
function isStoredReport(value: unknown): value is StoredReport {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;

  const report = entry.report as Record<string, unknown> | undefined;
  const image = entry.image as Record<string, unknown> | undefined;
  const context = entry.context as Record<string, unknown> | undefined;
  if (!report || !image || !context) return false;

  const reportValid =
    VALID_VERDICTS.includes(report.verdict as Verdict) &&
    typeof report.confidence === "number" &&
    typeof report.executiveSummary === "string" &&
    Array.isArray(report.strengths) &&
    report.strengths.every(isAnnotatedPoint) &&
    Array.isArray(report.weaknesses) &&
    report.weaknesses.every(isWeakness) &&
    Array.isArray(report.recommendations) &&
    report.recommendations.every((item) => typeof item === "string");

  const imageValid =
    typeof image.dataUrl === "string" &&
    typeof image.width === "number" &&
    typeof image.height === "number";

  const contextValid =
    typeof context.brandName === "string" &&
    typeof context.website === "string" &&
    typeof context.industry === "string" &&
    typeof context.campaignObjective === "string" &&
    (context.targetAudience === undefined ||
      typeof context.targetAudience === "string");

  return reportValid && imageValid && contextValid;
}

// Reports only resolve in the browser tab/session that generated them —
// see ARCHITECTURE.md. They survive a refresh in that same session, but
// are not shareable across devices or after the session ends.
export const sessionStorageReportStore: ReportStore = {
  save(entry) {
    const id = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(entry));
    return id;
  },
  load(id) {
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + id);
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    return isStoredReport(parsed) ? parsed : null;
  },
};
