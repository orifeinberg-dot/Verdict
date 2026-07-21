import type {
  AnnotatedPoint,
  AnnotationCategory,
  CampaignObjective,
  CreativeContext,
  Verdict,
  Weakness,
} from "./types";

// The three dimensions a weakness must belong to in order to be eligible
// for `blocking: true` ("critical" in VERDICT_INTELLIGENCE_FRAMEWORK.md's
// vocabulary) — see the Framework's Section 3 override condition.
// `brand_consistency` is deliberately excluded: a brand mismatch is real
// but essentially never makes an ad wasteful to run the way a policy
// rejection or a broken CTA does.
//
// This module trusts that `blocking` has already been constrained to this
// set before these functions run (INTELLIGENCE_IMPLEMENTATION_ARCHITECTURE.md
// Section 6, validation rule 2) — it does not re-validate that constraint
// itself. Re-checking it here would duplicate the validation layer's job,
// which is explicitly out of scope for this module.
const HIGH_STAKES_CATEGORIES: ReadonlySet<AnnotationCategory> = new Set([
  "policy_risk",
  "legibility",
  "message_clarity",
]);

// Fixed tie-break order used everywhere this module has to pick "the one
// finding that matters most" among several equally-eligible candidates.
// Order follows how VERDICT_INTELLIGENCE_FRAMEWORK.md Section 2 describes
// each dimension's stakes: policy risk can void the spend entirely,
// legibility/message_clarity can each independently make the ad fail its
// job, brand consistency is a quality signal but never launch-blocking on
// its own.
const DIMENSION_PRIORITY: readonly AnnotationCategory[] = [
  "policy_risk",
  "legibility",
  "message_clarity",
  "brand_consistency",
];

function dimensionRank(category: AnnotationCategory): number {
  const rank = DIMENSION_PRIORITY.indexOf(category);
  return rank === -1 ? DIMENSION_PRIORITY.length : rank;
}

/**
 * Computes the Launch / Test / Don't Launch verdict from a set of already-
 * validated weaknesses, per VERDICT_INTELLIGENCE_FRAMEWORK.md Section 3's
 * decision tree. Never asserted by a model — this is the one place the
 * verdict is decided.
 *
 * Purpose: replace "pick a verdict, then find evidence for it" (the mock
 * engine's approach) with "the evidence determines the verdict."
 *
 * Inputs: `weaknesses` — validated `Weakness[]`. Strengths never factor
 * into the verdict: per the Framework, a clean creative is the *absence*
 * of disqualifying weaknesses, not the presence of enough strengths to
 * outweigh them.
 *
 * Output: `Verdict` — exactly one of "launch" | "test" | "dont_launch".
 *
 * Algorithm (three branches, evaluated in order — first match wins):
 * 1. Any weakness with `blocking: true` → "dont_launch". A single critical
 *    finding is launch-blocking on its own, regardless of how many
 *    strengths exist elsewhere.
 * 2. Else, any non-blocking weakness in a high-stakes dimension
 *    (`policy_risk`, `legibility`, `message_clarity`) → "test".
 * 3. Else (no high-stakes weaknesses at all; at most non-blocking
 *    `brand_consistency` weaknesses) → "launch".
 */
export function computeVerdict(weaknesses: readonly Weakness[]): Verdict {
  const hasCriticalWeakness = weaknesses.some((weakness) => weakness.blocking);
  if (hasCriticalWeakness) return "dont_launch";

  const hasNotableHighStakesWeakness = weaknesses.some(
    (weakness) => !weakness.blocking && HIGH_STAKES_CATEGORIES.has(weakness.category),
  );
  if (hasNotableHighStakesWeakness) return "test";

  return "launch";
}

const TOTAL_DIMENSIONS = 4;
// Total finding count at which "depth" stops adding to confidence. Chosen
// as a round number comfortably above the mock engine's typical 2-7
// findings per report, so a well-covered, moderately-sized report can
// reach full depth without requiring an unrealistically large finding
// count.
const DEPTH_SATURATION_COUNT = 6;
const MIN_CONFIDENCE = 1;
const MAX_CONFIDENCE = 99;

/**
 * Computes a deterministic confidence score (0-100) from evidence coverage
 * and depth — never a model-asserted number. Per VERDICT_INTELLIGENCE_FRAMEWORK.md
 * Section 5, confidence and verdict are computed independently so the two
 * "can't be confused" (a "Test" verdict can carry high confidence).
 *
 * Purpose: express how much evidence backs the report, not how sure a
 * model "feels."
 *
 * Inputs:
 * - `strengths` — validated `AnnotatedPoint[]`.
 * - `weaknesses` — validated `Weakness[]`.
 * - `coveredDimensions` — the `AnnotationCategory` values that were
 *   actually evaluated, whether or not they produced a finding. This is
 *   deliberately a separate input rather than derived from
 *   `strengths`/`weaknesses`: a dimension that was checked and found
 *   clean is indistinguishable from one that was never checked at all if
 *   you only look at the findings arrays — the caller has to say which
 *   dimensions were actually covered.
 *
 * Output: `number`, an integer in [1, 99]. Never 0 or 100 — a report is
 * never presented as having literally zero or absolute certainty.
 *
 * Algorithm — two equally-weighted deterministic signals, each
 * contributing up to 50 points:
 *
 * - **Coverage** (0–50): the fraction of the four fixed dimensions
 *   that were evaluated.
 *
 * Finding sufficiency (0–50): a temporary Phase 1 proxy based on the
 * number of validated findings, scaled up to 
 * DEPTH_SATURATION_COUNT.
 *
 * This Phase 1 implementation intentionally does not incorporate an
 * agreement signal. A future milestone will extend this calculation
 * using validation metadata (for example contradiction detection or
 * other consistency checks) once the validation layer is implemented.
 *
 * This function assumes all findings have already passed the validation
 * layer.
 *
 * The current confidence score is therefore based only on evaluation
 * coverage and finding sufficiency.
 *
 * Future milestones will extend this calculation with an agreement
 * signal produced by the validation layer after contradiction detection
 * and other consistency checks have been completed.
 */
export function computeConfidence(
  strengths: readonly AnnotatedPoint[],
  weaknesses: readonly Weakness[],
  coveredDimensions: readonly AnnotationCategory[],
): number {
  const uniqueCoveredDimensions = new Set(coveredDimensions);
  const coverageScore = 50 * (uniqueCoveredDimensions.size / TOTAL_DIMENSIONS);

  const totalFindings = strengths.length + weaknesses.length;
  const depthScore = 50 * Math.min(1, totalFindings / DEPTH_SATURATION_COUNT);

  const raw = Math.round(coverageScore + depthScore);
  return Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, raw));
}

/**
 * Selects the single finding the executive summary should be built
 * around, per VERDICT_INTELLIGENCE_FRAMEWORK.md Section 4's requirement
 * that the summary be "anchored to... the finding(s) that drove the
 * computed verdict."
 *
 * Purpose: give `assembleExecutiveSummary` one concrete, real finding to
 * narrate instead of picking an arbitrary array position (the mock
 * engine's `strengths[0]` / `weaknesses[0]` approach, which this module
 * exists to replace).
 *
 * Inputs:
 * - `verdict` — the already-computed `Verdict` (from `computeVerdict`).
 * - `strengths` — validated `AnnotatedPoint[]`.
 * - `weaknesses` — validated `Weakness[]`.
 *
 * Output: `AnnotatedPoint | undefined`. `undefined` only when the
 * relevant candidate list is empty for the given verdict — a degenerate
 * input (e.g. "dont_launch" with no `blocking` weakness present) that
 * this function handles gracefully rather than throwing, since it must
 * stay pure and total for any input.
 *
 * Selection rule, by verdict:
 * - **"dont_launch"** → a critical weakness (`blocking: true`).
 * - **"test"** → the most important *notable* (non-blocking) weakness in
 *   a high-stakes dimension (`policy_risk`, `legibility`,
 *   `message_clarity`) — the same dimensions that can drive a "test"
 *   verdict in `computeVerdict`.
 * - **"launch"** → the strongest strength.
 *
 * Tie-breaking (documented per the milestone's requirement): when more
 * than one finding is eligible, this function picks by fixed dimension
 * priority — `policy_risk` > `legibility` > `message_clarity` >
 * `brand_consistency` (see `DIMENSION_PRIORITY` above) — and, if multiple
 * eligible findings remain in the same dimension, falls back to first
 * occurrence in the input array. There is no other signal in the data
 * model (no numeric severity on strengths, no ordering guarantee on
 * either array) to break a tie with, so "first in the highest-priority
 * dimension" is the simplest rule that is still deterministic.
 *
 * Fallback behavior for mismatched input (verdict doesn't match what the
 * findings would actually produce via `computeVerdict`): each branch
 * degrades gracefully — "dont_launch" with no critical weakness falls
 * back to the same selection "test" would use, then to any weakness at
 * all; "test" with no eligible weakness falls back to any weakness at
 * all. This keeps the function total without requiring it to re-run
 * `computeVerdict` itself.
 */
export function selectAnchorFinding(
  verdict: Verdict,
  strengths: readonly AnnotatedPoint[],
  weaknesses: readonly Weakness[],
): AnnotatedPoint | undefined {
  function strongestBy(candidates: readonly AnnotatedPoint[]): AnnotatedPoint | undefined {
    if (candidates.length === 0) return undefined;
    return [...candidates].sort((a, b) => dimensionRank(a.category) - dimensionRank(b.category))[0];
  }

  if (verdict === "dont_launch") {
    const criticalWeaknesses = weaknesses.filter((weakness) => weakness.blocking);
    if (criticalWeaknesses.length > 0) return strongestBy(criticalWeaknesses);
    // Degenerate input: no critical weakness despite a "dont_launch"
    // verdict. Fall through to the "test" rule, then to any weakness.
    const notableHighStakes = weaknesses.filter(
      (weakness) => !weakness.blocking && HIGH_STAKES_CATEGORIES.has(weakness.category),
    );
    if (notableHighStakes.length > 0) return strongestBy(notableHighStakes);
    return strongestBy(weaknesses);
  }

  if (verdict === "test") {
    const notableHighStakes = weaknesses.filter(
      (weakness) => !weakness.blocking && HIGH_STAKES_CATEGORIES.has(weakness.category),
    );
    if (notableHighStakes.length > 0) return strongestBy(notableHighStakes);
    // Degenerate input: "test" with no eligible weakness. Fall back to
    // any weakness at all rather than returning undefined.
    return strongestBy(weaknesses);
  }

  // verdict === "launch"
  return strongestBy(strengths);
}

function objectiveLabel(objective: CampaignObjective): string {
  switch (objective) {
    case "awareness":
      return "awareness";
    case "traffic":
      return "traffic";
    case "conversions":
      return "conversions";
    case "app_installs":
      return "app-install";
  }
}

/**
 * Deterministically composes the report's executive summary from the
 * computed verdict, the anchor finding, and the submitted campaign
 * context. Replaces the mock engine's random-template approach — this
 * generator is a single, fixed composition per verdict, not a pool of
 * interchangeable variants, so it needs no randomness to be varied: the
 * variation comes entirely from the real anchor finding's own text.
 *
 * Purpose: guarantee, by construction, that the executive summary
 * narrates the finding that actually produced the verdict (per
 * VERDICT_INTELLIGENCE_FRAMEWORK.md Section 4) rather than an arbitrary
 * array position.
 *
 * Inputs:
 * - `verdict` — the already-computed `Verdict`.
 * - `anchor` — the finding from `selectAnchorFinding`, or `undefined` in
 *   the degenerate case where none was available.
 * - `context` — the submitted `CreativeContext`, used for the brand name
 *   and campaign objective.
 *
 * Output: `string`, a short, plain-language paragraph in the direct,
 * unhedged voice PRODUCT_SPEC.md's "Voice and tone" describes — built
 * from the anchor finding's own `summary` text, never from a fixed pool
 * of alternative sentences.
 */
export function assembleExecutiveSummary(
  verdict: Verdict,
  anchor: AnnotatedPoint | undefined,
  context: CreativeContext,
): string {
  const brand = context.brandName || "This creative";
  const objective = objectiveLabel(context.campaignObjective);

  switch (verdict) {
    case "launch":
      return anchor
        ? `${brand} clears every high-stakes check — ${anchor.summary} Nothing here should hold back a ${objective} campaign.`
        : `${brand} clears every high-stakes check, with no notable issues on record. Nothing here should hold back a ${objective} campaign.`;
    case "test":
      return anchor
        ? `${brand} isn't a clean launch yet — ${anchor.summary} Worth resolving before committing full budget to a ${objective} campaign.`
        : `${brand} isn't a clean launch yet, though no single issue stands out as the reason. Worth a second look before committing full budget to a ${objective} campaign.`;
    case "dont_launch":
      return anchor
        ? `${brand} shouldn't spend against this creative as-is — ${anchor.summary} Fix the flagged issue before this reaches a real audience.`
        : `${brand} shouldn't spend against this creative as-is, though the specific critical issue wasn't captured here. Review the flagged findings before this reaches a real audience.`;
  }
}
