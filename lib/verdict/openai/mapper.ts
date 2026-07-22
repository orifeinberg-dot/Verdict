import type { AnnotatedPoint, AnnotationCategory, Weakness } from "../types";
import type { PerceptionResult } from "../perception";
import type { OpenAIPerceptionResponse, RawFinding, RawWeakness } from "./schema";

/**
 * Converts a raw `OpenAIPerceptionResponse` into a `PerceptionResult` —
 * the boundary between untrusted provider data and Verdict's domain
 * model. Per `docs/INTELLIGENCE_IMPLEMENTATION_ARCHITECTURE.md` and
 * `schema.ts`'s own documented pipeline:
 *
 *   OpenAI response → Raw schema → this mapper → PerceptionResult
 *     → validation.ts → Decision Engine
 *
 * This module's only job is the shape conversion: assigning
 * application-owned `id`s and narrowing `category` from an unvalidated
 * `string` into the real `AnnotationCategory` union. It deliberately does
 * *not* perform any business validation — no `blocking`-eligibility
 * enforcement, no verdict/confidence computation, no executive-summary
 * generation, no recommendation normalization or fallback. Those remain
 * `validation.ts` and `decision-engine.ts`'s exclusive responsibility,
 * applied downstream of this mapper's output. A `Weakness` with
 * `blocking: true` on `brand_consistency`, for example, is passed through
 * unchanged here — coercing it would duplicate `validation.ts`'s job and
 * blur the boundary this file exists to keep sharp.
 */

const VALID_CATEGORIES: ReadonlySet<string> = new Set<AnnotationCategory>([
  "policy_risk",
  "legibility",
  "brand_consistency",
  "message_clarity",
]);

/**
 * Narrows a raw, unvalidated category string into the domain
 * `AnnotationCategory` union. Fails deterministically — no silent
 * coercion and no fallback category — when the value isn't one of the
 * four known categories, since inventing a category here would let bad
 * provider data reach the deterministic pipeline disguised as valid.
 */
function narrowCategory(category: string): AnnotationCategory {
  if (VALID_CATEGORIES.has(category)) {
    return category as AnnotationCategory;
  }
  throw new Error(`Unknown perception category from OpenAI response: "${category}"`);
}

function mapFinding(raw: RawFinding): AnnotatedPoint {
  return {
    id: crypto.randomUUID(),
    category: narrowCategory(raw.category),
    summary: raw.summary,
    evidence: raw.evidence,
    boundingBox: raw.boundingBox,
  };
}

function mapWeakness(raw: RawWeakness): Weakness {
  return {
    ...mapFinding(raw),
    blocking: raw.blocking,
  };
}

/**
 * Maps a raw `OpenAIPerceptionResponse` into a `PerceptionResult`.
 * Assigns a fresh, application-owned `id` to every finding (the model is
 * never asked for one — see `schema.ts`), narrows each `category`, and
 * otherwise preserves every field — including `blocking` proposals,
 * bounding boxes, and recommendation order — unchanged.
 *
 * Throws if any finding's `category` is not one of the four known
 * `AnnotationCategory` values; see `narrowCategory` above.
 */
export function mapOpenAIResponse(response: OpenAIPerceptionResponse): PerceptionResult {
  return {
    strengths: response.strengths.map(mapFinding),
    weaknesses: response.weaknesses.map(mapWeakness),
    recommendations: [...response.recommendations],
  };
}
