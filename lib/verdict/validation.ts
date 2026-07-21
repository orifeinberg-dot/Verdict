import type { AnnotationCategory, Weakness } from "./types";

// The three dimensions a weakness must belong to in order to carry
// `blocking: true`. Defined once, here — per
// INTELLIGENCE_IMPLEMENTATION_ARCHITECTURE.md Section 6's validation rule
// 2 — and nowhere else. decision-engine.ts's `computeVerdict()` trusts
// this has already been enforced and deliberately does not re-check it
// itself (see that function's own doc comment); this module is what
// makes that trust warranted.
const BLOCKING_ELIGIBLE_CATEGORIES: ReadonlySet<AnnotationCategory> = new Set([
  "policy_risk",
  "legibility",
  "message_clarity",
]);

function isBlockingEligibleCategory(category: AnnotationCategory): boolean {
  return BLOCKING_ELIGIBLE_CATEGORIES.has(category);
}

/**
 * Enforces the one validation rule this module exists for: only
 * `policy_risk`, `legibility`, and `message_clarity` weaknesses may carry
 * `blocking: true`. A weakness from any other category (e.g.
 * `brand_consistency`) marked `blocking: true` is normalized to
 * `blocking: false` — never dropped, never thrown on.
 *
 * Purpose: close the gap documented in DEVELOPMENT_PLAN.md after
 * Milestone 025 — the mock generator (and, eventually, a real model) can
 * propose `blocking: true` on any category, but nothing downstream
 * re-checks category eligibility; `computeVerdict()` in decision-engine.ts
 * reads `blocking` at face value by design. This function is the one
 * place that eligibility is actually enforced, upstream of that trust.
 *
 * Inputs: `weaknesses` — a `Weakness[]` in any state (blocking flags not
 * yet checked against category eligibility).
 *
 * Output: a new `Weakness[]`, same length and order as the input, where
 * every weakness's `blocking` flag is legal per the rule above. No
 * weakness is ever removed, and no field other than an invalid `blocking`
 * value is ever changed.
 *
 * Purity: never mutates the input array or any input weakness object. A
 * weakness that's already valid (either `blocking: false`, or
 * `blocking: true` on an eligible category) is returned by the exact same
 * object reference; a new object is allocated only for a weakness that
 * actually needs its `blocking` flag corrected.
 */
export function validateWeaknesses(weaknesses: Weakness[]): Weakness[] {
  return weaknesses.map((weakness) => {
    const needsCorrection = weakness.blocking && !isBlockingEligibleCategory(weakness.category);
    return needsCorrection ? { ...weakness, blocking: false } : weakness;
  });
}
