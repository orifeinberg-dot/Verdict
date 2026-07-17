import type {
  AnnotatedPoint,
  AnnotationCategory,
  Occasion,
  StoredCampaignType,
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

// Current Campaign Type options plus retired ones ("sale", "holiday",
// "seasonal") from before the taxonomy simplification — see
// StoredCampaignType in lib/verdict/types.ts. An explicit allowlist
// rather than "any string" so genuinely malformed data still fails
// closed to null.
const VALID_STORED_CAMPAIGN_TYPES: StoredCampaignType[] = [
  "evergreen",
  "promotion",
  "product_launch",
  "retargeting",
  "brand_awareness",
  "other",
  "sale",
  "holiday",
  "seasonal",
];

const VALID_OCCASIONS: Occasion[] = [
  "none",
  "black_friday",
  "cyber_monday",
  "christmas",
  "valentines_day",
  "mothers_day",
  "fathers_day",
  "back_to_school",
  "new_year",
  "summer_sale",
  "spring_sale",
  "other",
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
    VALID_STORED_CAMPAIGN_TYPES.includes(
      context.campaignType as StoredCampaignType,
    ) &&
    (context.occasion === undefined ||
      VALID_OCCASIONS.includes(context.occasion as Occasion)) &&
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
    try {
      sessionStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(entry));
    } catch (cause) {
      // Most commonly a QuotaExceededError — sessionStorage has a small
      // per-origin limit. Callers should catch this and show an inline
      // error rather than let it crash the app.
      throw new Error("Failed to save report to sessionStorage", { cause });
    }
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
