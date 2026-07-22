/**
 * Schema responsibilities — and only these: describe the exact shape a
 * structured response from an OpenAI Vision perception provider must
 * have, so that shape can be requested from the API (e.g. via a
 * structured-output / function-calling `response_format`) and parsed
 * without guesswork once that integration exists.
 *
 * This module mirrors `PerceptionResult` (`../perception.ts`) field for
 * field — `strengths`, `weaknesses`, `recommendations`, nothing more and
 * nothing less. It deliberately does not reuse `AnnotatedPoint`/`Weakness`
 * from `../types.ts` directly, for the same reason
 * `docs/INTELLIGENCE_IMPLEMENTATION_ARCHITECTURE.md`'s proposed
 * `RawFinding`/`RawWeakness` types exist: a model's raw output is not yet
 * trustworthy. `id` is server-assigned and never requested from the
 * model; `category` arrives as an unvalidated string and `blocking`
 * arrives as the model's own proposal.
 *
 * This file defines the *raw provider response* only. It is not a
 * validated domain object, and nothing in this file performs validation.
 * The intended pipeline for a future OpenAI provider is:
 *
 *   OpenAI response
 *         ↓
 *   Raw schema (this file — `OpenAIPerceptionResponse`)
 *         ↓
 *   Provider parser / mapper (future, OpenAI-specific — not yet built)
 *         ↓
 *   `PerceptionResult` (`../perception.ts`)
 *         ↓
 *   `validation.ts`
 *         ↓
 *   Decision Engine
 *
 * The future provider parser/mapper — not `validation.ts` — is what will
 * be responsible for assigning `id`s, narrowing `category` from `string`
 * into `AnnotationCategory`, and otherwise converting this raw shape into
 * a real `PerceptionResult`. `validation.ts` continues to do exactly what
 * it does today: validate already-shaped domain objects (e.g. enforcing
 * the `blocking`-eligibility rule on real `Weakness` values) — it must
 * never be asked to parse arbitrary provider output itself, or its
 * contract stops being "trusted domain objects in, trusted domain
 * objects out."
 */

/** A single pre-validation observation, as the model would return it. */
export interface RawFinding {
  category: string;
  summary: string;
  evidence: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

/** A pre-validation weakness — a `RawFinding` plus the model's own, not-yet-trusted `blocking` proposal. */
export type RawWeakness = RawFinding & { blocking: boolean };

/** The full pre-validation response shape, mirroring `PerceptionResult`. */
export interface OpenAIPerceptionResponse {
  strengths: RawFinding[];
  weaknesses: RawWeakness[];
  recommendations: string[];
}

// The same four domain category values `AnnotationCategory` (`../types.ts`)
// already defines — repeated here as plain strings (rather than imported)
// only so this file stays a self-contained, inert JSON value with no
// dependency needed at the point a real API call passes it as
// `response_format`. This is not a business rule: it's the same fixed,
// already-established taxonomy, just constraining what the structured
// output request will accept.
const ANNOTATION_CATEGORY_VALUES = [
  "policy_risk",
  "legibility",
  "brand_consistency",
  "message_clarity",
] as const;

// TODO(openai-provider): decide the bounding-box coordinate system before
// implementing a real provider — e.g. normalized coordinates (0–1) vs.
// pixel coordinates vs. the percentage-of-width/height convention
// `BoundingBox` (`../types.ts`) already uses for validated findings.
// Deliberately left undecided here; whichever is chosen, the future
// provider parser/mapper is what will convert it into `BoundingBox`'s
// shape, not this schema.
const boundingBoxJsonSchema = {
  type: "object",
  properties: {
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
  },
  required: ["x", "y", "width", "height"],
  additionalProperties: false,
} as const;

const findingJsonSchema = {
  type: "object",
  properties: {
    // Constrains the structured output request to the four valid
    // categories. `RawFinding.category` above stays typed as `string`,
    // not `AnnotationCategory` — the application must still defensively
    // parse/validate this field rather than trust the API's enum
    // enforcement (see the module doc comment above).
    category: { type: "string", enum: ANNOTATION_CATEGORY_VALUES },
    summary: { type: "string" },
    evidence: { type: "string" },
    boundingBox: boundingBoxJsonSchema,
  },
  required: ["category", "summary", "evidence"],
  additionalProperties: false,
} as const;

const weaknessJsonSchema = {
  type: "object",
  properties: {
    ...findingJsonSchema.properties,
    blocking: { type: "boolean" },
  },
  required: [...findingJsonSchema.required, "blocking"],
  additionalProperties: false,
} as const;

/**
 * A plain JSON Schema description of `OpenAIPerceptionResponse`, usable
 * with a structured-output API once one is actually called. Kept as a
 * plain object — no SDK types, no network call — so this milestone stays
 * an inert contract, not an integration.
 */
export const PERCEPTION_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    strengths: { type: "array", items: findingJsonSchema },
    weaknesses: { type: "array", items: weaknessJsonSchema },
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: ["strengths", "weaknesses", "recommendations"],
  additionalProperties: false,
} as const;
