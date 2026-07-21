# Verdict — Intelligence Implementation Architecture

This document is the output of Milestone 022
(`agents/prompts/022-design-intelligence-implementation-architecture.md`):
the implementation-ready architecture that translates the methodology in
`docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` into a concrete software design
for Verdict's real evaluation pipeline. It was produced by a panel — Staff
Software Architect, Staff AI Engineer, Senior TypeScript Engineer, Backend
Platform Engineer, AI Product Architect, Technical Lead for long-term
maintainability — reviewing `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md`,
`docs/PRODUCT_SPEC.md`, `docs/UI_SPEC.md`, `docs/ARCHITECTURE.md`,
`docs/DEVELOPMENT_PLAN.md`, `docs/ROADMAP.md`, and the current
implementation (`lib/verdict/types.ts`, `lib/verdict/mock-engine.ts`,
`lib/verdict/index.ts`, `app/actions/submit-creative.ts`,
`lib/report-store/types.ts`, `lib/report-store/session-storage-store.ts`,
`components/verdict-report.tsx`, `components/verdict-badge.tsx`).

No production code, TypeScript file, UI component, `docs/ROADMAP.md`, or
`docs/DEVELOPMENT_PLAN.md` was changed to produce this document. Every
interface shown below is **proposed** — none of it has been written into
the codebase. `VerdictEngine`'s existing public interface
(`analyze(image, context): Promise<VerdictReport>`) is treated as fixed
and is never altered by any recommendation in this document.

**Guiding principles applied throughout:** prefer simplicity over
sophistication; every abstraction must justify its existence; prefer
deterministic software over model judgment whenever possible; AI should
observe, server-side code should decide; every verdict should be
explainable; avoid designing for hypothetical future requirements. Where a
trade-off exists between a clever design and an obvious one, this document
picks the obvious one.

---

## 1. Executive Summary

The current mock engine picks a verdict first and manufactures matching
findings afterward (`docs/VERDICT_INTELLIGENCE_FRAMEWORK.md`, Section 1).
This architecture inverts that structurally, not just procedurally: **the
model is only ever asked to observe** — produce findings, evidence, and
recommendations — and is never asked for a verdict, a confidence score, or
an executive summary. All three are computed or assembled by new,
independently testable, pure deterministic functions from the model's
validated output. This is the single architectural decision everything
else in this document supports.

Concretely: a new internal pipeline (prompt construction → structured
model call → validation/coercion → deterministic decision engine →
deterministic report assembly) lives entirely **inside** whichever
`VerdictEngine` implementation is selected. Nothing above that interface —
`lib/verdict/index.ts`'s selection seam, `app/actions/submit-creative.ts`,
`lib/report-store/*`, or any component — needs to change at any point in
the migration from mock to real. The migration itself is staged through a
**hybrid engine**: the existing mock engine's random-but-seeded finding
generation is routed through the same deterministic decision engine and
report assembler the real model will use, so the highest-risk new code
(the decision logic) is built, tested, and stabilized entirely offline,
before any model API cost or latency enters the picture.

---

## 2. Evaluation Pipeline

The stage names below are the ones specified in Milestone 022's
Requirement 1, in order. Two pairs of adjacent stages collapse into a
single implementation step, noted explicitly — this is a deliberate
simplification, not an omission: because the AI contract (Section 5)
requires structured JSON output rather than freeform text, there is
nothing to separately "extract" from a response that is already
findings-shaped.

| # | Stage | Owner | Module (proposed) |
|---|---|---|---|
| 1 | Creative submission | Presentation | `/analyze` page + `submitCreative` Server Action (unchanged) |
| 2 | Image preprocessing | Deterministic | `lib/validation.ts` (client-side today; a server-side re-check is added in Phase 2, still deterministic — see `docs/ARCHITECTURE.md`'s "Validation") |
| 3 | CreativeContext construction | Deterministic | `context-form.tsx` + `submitCreative`'s existing required-field check (unchanged) |
| 4 | Model request | AI boundary | `lib/verdict/openai-engine.ts` calls the model; the prompt itself is built by a deterministic pure function (Section 3) |
| 5 | Structured model response | AI-generated | Raw, untrusted JSON matching the AI contract (Section 5) |
| 6 | Validation | Deterministic | `lib/verdict/output-validation.ts` (proposed) — **this is also where "Evidence extraction" and "Finding generation" resolve**: the model returns findings-with-evidence directly as structured fields, so there is no separate extraction pass against unstructured text |
| 7 | Severity validation | Deterministic | Same module — `blocking` eligibility coercion (Section 6) |
| 8 | Deterministic verdict computation | Deterministic | `lib/verdict/decision-engine.ts` (proposed) |
| 9 | Deterministic confidence computation | Deterministic | Same module |
| 10 | Recommendation generation | AI-generated, then validated | Produced in the same model response as step 5; validated for non-emptiness in step 6 |
| 11 | Executive summary generation | Deterministic | `lib/verdict/report-assembler.ts` (proposed) — assembled **after** the verdict is known, not authored by the model; see Section 5's rationale |
| 12 | `VerdictReport` | Deterministic (boundary object) | The report assembler's output — the same public type as today |
| 13 | Persistence | Deterministic | `lib/report-store/*` (unchanged) |
| 14 | UI rendering | Presentation | `components/verdict-report.tsx` and friends (unchanged) |

**Why executive summary generation is deterministic, not AI-authored:**
this is the one point in the pipeline where this document makes a call
`docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` left open (it required the
summary be "anchored to... the finding(s) that drove the computed
verdict" without specifying who writes the prose). If the model authored
the summary in the same call that produces findings, it would necessarily
be narrating around its *own* guess at the verdict — but the actual
verdict is computed afterward, from validated and possibly-coerced
findings, and can differ from the model's guess. Authoring the summary
deterministically, after the verdict is computed, makes the anchoring
requirement true by construction instead of by prompt-compliance hope,
and avoids a second model call. See Section 5 and Open Questions for the
trade-off this forecloses.

---

## 3. System Responsibilities

| Component | Owns | Never owns | Inputs | Outputs |
|---|---|---|---|---|
| **Mock engine** (`mock-engine.ts`) | Fabricating plausible raw findings for offline development/demo, with no network dependency | Verdict, confidence, or executive summary composition (once migrated — see Section 8) | `CreativeImage`, `CreativeContext` | Raw findings (post-migration) or a complete `VerdictReport` (pre-migration, today's behavior) |
| **Future OpenAI engine** (`openai-engine.ts`) | Constructing the prompt, calling the model, parsing the structured response into raw findings | Deciding the verdict, computing confidence, or writing the executive summary | `CreativeImage`, `CreativeContext` | Raw, unvalidated findings + recommendations |
| **Prompt construction** (pure function inside `openai-engine.ts` or `lib/verdict/prompt.ts`) | Turning `CreativeContext` + image into the exact instructions the model receives, including the four dimension definitions from `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` Section 2 | Any judgment about the creative itself; any retry/validation logic | `CreativeImage`, `CreativeContext` | A prompt string/structured request payload |
| **Structured output parser** (inside `openai-engine.ts`) | Converting the model's raw JSON into the `RawFinding`/`RawWeakness` shape (Section 4) | Judging whether a finding is *valid* — only whether it's shaped correctly | Raw model JSON | `RawFinding[]`, `RawWeakness[]`, `string[]` (recommendations) |
| **Validation layer** (`output-validation.ts`) | Applying the coercion/rejection rules in Section 6; producing only findings safe to reason about further | Deciding the verdict or confidence; authoring copy | Raw findings/recommendations | Validated findings/recommendations, or a typed rejection requiring retry |
| **Deterministic decision engine** (`decision-engine.ts`) | Computing `verdict` and `confidence` from validated findings, per `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` Section 3 and 5 | Generating findings, evidence, or copy of any kind | Validated findings | `Verdict`, `confidence: number`, an "anchor" finding reference |
| **Report assembler** (`report-assembler.ts`) | Composing the final `VerdictReport` — assigning ids, deriving the executive summary from the anchor finding, applying the recommendation fallback | Any of the decisions above — it composes, it doesn't decide | Validated findings, computed verdict/confidence, `CreativeContext` | `VerdictReport` |
| **Persistence layer** (`lib/report-store/*`) | Saving/loading a `StoredReport` keyed by id | Anything about how the report's contents were produced | `StoredReport` | An id (`save`) / a `StoredReport \| null` (`load`) |

No new abstraction layer sits above these — `lib/verdict/index.ts`'s
existing one-line engine-selection seam is unchanged, and nothing here
introduces a plugin registry, strategy factory, or generic "pipeline
runner." Each responsibility above maps to one proposed file.

---

## 4. Domain Model Recommendations

Reviewed against `lib/verdict/types.ts`. No renames or deprecations are
recommended — forcing one here would add churn without changing any
outcome, which the guiding principles rule out.

### `VerdictReport` — no structural change

The public shape (`verdict`, `confidence`, `executiveSummary`,
`strengths`, `weaknesses`, `recommendations`) stays exactly as-is. What
changes is *how* `verdict`, `confidence`, and `executiveSummary` are
produced (Section 2), not their type.

### `AnnotatedPoint` — one addition

```ts
// proposed addition, not implemented by this milestone
type AnnotatedPoint = {
  id: string;
  category: AnnotationCategory;
  summary: string;
  evidence: string; // NEW — required, non-empty; the literal observation
                     // grounding `summary`, per FRAMEWORK.md Section 5
  boundingBox?: BoundingBox;
};
```

This is the only addition to a currently-public type this document
recommends, and it's the one `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md`
already specifies as non-optional (Section 5) — everything else proposed
below is internal-only.

### `Weakness` — no structural change

`blocking: boolean` stays as-is. Its *legal values* are now constrained
(only `policy_risk`/`legibility`/`message_clarity` findings may set it
`true`), but that constraint is enforced at runtime by the validation
layer (Section 6), not encoded as a discriminated union in the type — a
type-level encoding was considered and rejected as over-engineering for a
single boolean rule.

### `CreativeContext`, `VerdictEngine` — unchanged

Both are already adequate: `CreativeContext` as prompt-construction input,
`VerdictEngine` as the fixed public seam. Per this milestone's
constraints, neither is touched.

### New internal-only types (never cross the `VerdictEngine` boundary)

```ts
// proposed, internal to the openai-engine/mock-engine implementation —
// never returned from VerdictEngine.analyze()

// What the model is actually asked to produce (Section 5) — deliberately
// narrower than VerdictReport: no id, no verdict, no confidence, no
// executiveSummary.
type ModelEvaluationOutput = {
  strengths: RawFinding[];
  weaknesses: RawWeakness[];
  recommendations: string[];
};

// Pre-validation shapes: fields are present but not yet trustworthy —
// category may be any string, evidence may be empty, boundingBox may be
// out of range. This is what the validation layer (Section 6) consumes
// and narrows into the real AnnotatedPoint/Weakness types.
type RawFinding = {
  category: string;
  summary: string;
  evidence: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
};
type RawWeakness = RawFinding & { blocking: boolean };
```

The raw/validated distinction is what makes the validation layer's job
type-checkable once implemented: a function's signature
(`RawFinding[] -> AnnotatedPoint[]`) states the narrowing it performs
instead of leaving "has this been checked yet?" as an unenforced
convention.

---

## 5. AI Contract

Every `VerdictReport` field, classified per Milestone 022's Requirement 4:

| Field | Classification | Notes |
|---|---|---|
| `verdict` | **Server-computed** | No longer AI-generated. See rationale below. |
| `confidence` | **Server-computed** | No longer AI-generated. See rationale below. |
| `executiveSummary` | **Derived** | No longer AI-generated. Assembled from the computed verdict + anchor finding. See rationale below. |
| `strengths[].id` / `weaknesses[].id` | **Server-computed** | Assigned by the report assembler (`crypto.randomUUID()`), never by the model — the model has no reason to produce stable ids. |
| `strengths[].category` / `weaknesses[].category` | **AI-generated, validated** | Must be one of the four `AnnotationCategory` values (Section 6, rule 1). |
| `strengths[].summary` / `weaknesses[].summary` | **AI-generated** | The marketer-voice takeaway. |
| `strengths[].evidence` / `weaknesses[].evidence` | **AI-generated, validated** | Must be non-empty (Section 6, rule 1). |
| `strengths[].boundingBox` / `weaknesses[].boundingBox` | **AI-generated, validated** | Optional; when present, coordinates must be in range (Section 6, rule 5). |
| `weaknesses[].blocking` | **AI-generated, validated** | Model proposes it; server coerces `false` when `category` is `brand_consistency` (Section 6, rule 2). |
| `recommendations` | **AI-generated, validated** | Validated for non-emptiness when weaknesses exist (Section 6, rule 7); a deterministic fallback is injected otherwise. |

### Why `verdict` and `confidence` are no longer AI-generated

This is not a new decision — `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md`
Section 5, rules 3 and 4, already mandate it. This document just makes it
concrete: the model's own stated verdict/confidence, if it produces one at
all, is discarded entirely rather than requested — asking for it would
only invite the "AI should observe, server-side code should decide"
principle to be violated by prompt wording rather than architecture.

### Why `executiveSummary` is no longer AI-generated

This **is** a call this document makes that `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md`
left open (see Section 2's note above). Authoring the summary
deterministically, from the already-computed verdict and its anchor
finding, is what guarantees the Framework's "anchored to the finding that
drove the verdict" requirement holds by construction, with no second model
call. The trade-off: the summary is now template-composed prose (an
evolution of today's mock engine's `buildExecutiveSummary`, operating on
real evidence instead of array position) rather than freely AI-authored —
see Open Questions for whether a later, optional AI polish pass over the
assembled summary is worth its added complexity once real model quality
is observed. This document recommends against building that now.

### What the model is asked to generate — final list

`strengths`, `weaknesses` (each with `category`, `summary`, `evidence`,
optional `boundingBox`, and — for weaknesses only — a proposed `blocking`),
and `recommendations`. Nothing else.

---

## 6. Validation Layer

| Failure mode | Handling | Reasoning |
|---|---|---|
| Missing/empty evidence on a finding | **Coercion** — drop the individual finding; **retry** only if this leaves zero total findings | A single bad finding shouldn't fail an otherwise-good response; zero findings is a structural failure worth one retry |
| Invalid category (not one of the four) | **Coercion** — drop the individual finding; **retry** only if this leaves zero findings | Can't safely guess which of the four dimensions was intended |
| Illegal `blocking` value (`true` on `brand_consistency`) | **Coercion** — force `false`, keep the finding | The correct value is known; no need to discard real evidence over it |
| Contradictory findings (overlapping bounding boxes, opposite polarity) | **Rejection** — discard the response, **retry** once (bounded) | Silently dropping only one side hides evidence the confidence computation should see as a coverage gap; picking a winner isn't Section 3's job (`docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` Section 3) |
| Malformed bounding box (out of 0–100, non-positive width/height, `NaN`) | **Coercion** — strip only the `boundingBox`, keep the finding | The finding still renders correctly as a creative-wide finding via the UI's existing "Applies to the overall creative" state (`docs/UI_SPEC.md`) — no need to discard the finding itself |
| Duplicate findings (near-identical evidence/summary or identical bounding box, same kind) | **Coercion** — drop the later duplicate, keep the first | Safe housekeeping; doesn't change what's being said |
| Inconsistent recommendations (`recommendations.length === 0` with `weaknesses.length > 0`) | **Coercion** — inject one deterministic fallback recommendation | Mirrors today's mock engine's zero-weakness fallback line; cheap, avoids a retry for a low-stakes gap |

**Retry policy:** bounded to a single retry per `analyze()` call. If the
retry also fails validation, the engine throws — which
`app/actions/submit-creative.ts` already catches today via its existing
`try { ... } catch { return { status: "error", ... } }` block, unchanged.
This is a deliberate point of "minimal disruption": the Server Action was
already written to expect engine failures; nothing about it needs to
change for this validation layer to exist.

Each rule above is a small, independently named, independently testable
pure function (Section 7) rather than one large `validate()` function —
see Section 9's "validation complexity" risk for why.

---

## 7. Decision Engine

All functions below are pure — no I/O, no randomness, fully unit-testable
against fixed inputs. Proposed location: `lib/verdict/decision-engine.ts`.

```ts
// Enforces AI-contract rule: blocking is only legal on the three
// high-stakes dimensions (FRAMEWORK.md Section 3's override condition).
function coerceBlockingEligibility(
  weaknesses: ValidatedWeakness[],
): ValidatedWeakness[]

// FRAMEWORK.md Section 3's three-branch decision tree.
function computeVerdict(weaknesses: ValidatedWeakness[]): Verdict

// FRAMEWORK.md Section 5: coverage (did all four dimensions produce a
// finding?) and agreement (were there unresolved contradictions?).
function computeConfidence(
  strengths: ValidatedFinding[],
  weaknesses: ValidatedWeakness[],
  dimensionsCovered: AnnotationCategory[],
): number

// Chooses the single finding the executive summary must be built around:
// the critical weakness for Don't Launch, the most severe notable
// weakness for Test, the strongest strength for Launch.
function selectAnchorFinding(
  verdict: Verdict,
  strengths: ValidatedFinding[],
  weaknesses: ValidatedWeakness[],
): AnnotatedPoint | undefined

// Deterministic template composition — the evolution of today's
// mock-engine buildExecutiveSummary, now driven by a real anchor finding
// instead of array position.
function assembleExecutiveSummary(
  verdict: Verdict,
  anchor: AnnotatedPoint | undefined,
  context: CreativeContext,
): string

// Top-level composition: assigns ids, orchestrates the functions above,
// and produces the final public type.
function assembleReport(
  validated: { strengths: ValidatedFinding[]; weaknesses: ValidatedWeakness[]; recommendations: string[] },
  context: CreativeContext,
): VerdictReport
```

Each function takes already-validated input and produces a plain value —
none of them know whether the findings originated from the mock engine or
a real model call, which is what makes the hybrid-engine migration stage
(Section 8) possible without duplicating this logic.

---

## 8. Migration Strategy

Three stages, matching Milestone 022's required path
(mock → hybrid → real), each preserving `VerdictEngine`'s public interface
exactly, so nothing above `lib/verdict/index.ts` — the Server Action, the
report store, or any component — changes at any stage.

### Stage A — today (mock engine, self-contained)

`mockVerdictEngine` generates findings **and** decides the verdict,
confidence, and summary itself, via the random-but-seeded logic
`docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` Section 1 critiques. This stage
already exists; nothing here changes it.

### Stage B — hybrid engine (the bridge, buildable before any model exists)

The mock engine's internals are refactored (its public
`VerdictEngine.analyze()` signature does not change) so that it: (1) still
fabricates findings the same seeded, deterministic way it does today,
including a fabricated but well-formed `evidence` string per finding, and
(2) stops deciding the verdict/confidence/summary itself — instead its
fabricated findings are run through the **real** validation layer
(Section 6) and decision engine (Section 7), the exact same code path the
OpenAI engine will use later.

This is the most important recommendation in this section: it lets the
highest-risk new code — validation and decision logic, not the model call
— be built, unit-tested, and stabilized entirely offline, at zero cost and
zero latency, before a single line of prompt or API code exists. It
directly extends `docs/DEVELOPMENT_PLAN.md`'s existing pattern of small,
visually-checkable increments to the AI-integration phase.

### Stage C — real evaluation engine

`openaiEngine` replaces only the *fabrication* step: prompt construction
(Section 3) → real model call → response parsing into the same
`RawFinding`/`RawWeakness` shape Stage B already exercises. From that
point on, the pipeline is identical to Stage B — the same validation
layer, the same decision engine, the same report assembler.
`lib/verdict/index.ts`'s existing one-line `VERDICT_ENGINE` branch
(already sketched in `docs/ARCHITECTURE.md`) selects between mock and
OpenAI implementations, unchanged from what's already planned.

Because `VerdictEngine`'s interface and `VerdictReport`'s shape never
change across any of these three stages, disruption to the existing UI is
not just minimized — for every component from `submit-creative.ts`
downward, it's zero.

---

## 9. Testing Strategy

| Layer | Test type | What it proves |
|---|---|---|
| `decision-engine.ts` | Unit (table-driven, fixed finding fixtures) | `computeVerdict`/`computeConfidence`/`selectAnchorFinding`/`assembleExecutiveSummary` are correct in isolation — no model or network involved |
| Full pipeline (validate → decide → assemble) | Deterministic regression | A small, frozen library of representative raw-model-response fixtures (JSON, not live calls) produces exact, unchanging `VerdictReport` output — catches accidental drift in the deterministic layer on every commit |
| `output-validation.ts` | Schema validation | Each Section 6 rule fires correctly: missing evidence, invalid category, illegal `blocking`, malformed bounding box, duplicate findings, empty recommendations |
| Prompt + real model | Prompt/calibration validation | Run infrequently (not on every commit) against a handful of real sample creatives with known issues, per `docs/ROADMAP.md` Phase 2 — proves the prompt is grounded in reality, which no unit test can prove; kept separate from the fast, free tests above so it never gates ordinary development |
| `submitCreative` + engine | Integration | End-to-end through the mock engine today, extended to the hybrid engine once it exists, proving the full pipeline before any real API cost is introduced |

No end-to-end browser test framework is recommended, consistent with
`docs/DEVELOPMENT_PLAN.md`'s existing Phase 1 stance — the manual
walkthrough pattern already established stays the right level of
investment for a project scoped to stay small enough for one person to
hold in their head (`docs/PRODUCT_SPEC.md`).

---

## 10. Risks

- **Unnecessary coupling.** The report assembler must never import
  anything about *how* findings were produced. Mitigation: it's built
  during Stage B (Section 8) against the mock engine's fabricated
  findings, which forces the raw-findings boundary to be real from day
  one rather than assumed.
- **Over-engineering.** A generic "pipeline runner" or plugin registry
  over-generalizes for exactly two engines. Mitigation: the two-file seam
  `docs/ARCHITECTURE.md` already prescribes ("one `if`, two files") is
  sufficient — this document deliberately adds no abstraction beyond the
  named modules in Section 3.
- **Prompt brittleness.** A prompt isn't type-checked; wording drift can
  silently change output quality in ways no unit test catches. Mitigation:
  the deterministic regression fixtures (Section 9) are a hard structural
  boundary the prompt must satisfy; the calibration suite gates any
  `VERDICT_ENGINE=openai` flip in a shared environment.
- **Validation complexity.** Too many bespoke coercion rules can become an
  untested, unreadable pile. Mitigation: each rule in Section 6 is a
  small, independently named, independently tested pure function, not one
  large `validate()` blob.
- **Hidden business logic inside prompts.** The single biggest risk
  category: if "what counts as critical" lived only in prompt wording, it
  would silently diverge from `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md`
  Sections 2–3 over time, unversioned and unreviewable as a diff.
  Mitigation: this is the concrete payoff of Section 5's AI contract — the
  model is asked only for observations and a single `blocking` guess that
  the decision engine independently re-validates; it is never asked for
  verdict, confidence, or criticality logic in prose.
- **Future maintenance burden.** The four dimensions are described in
  three places over time — this document, `AnnotationCategory` in
  `lib/verdict/types.ts`, and the prompt text. Mitigation: prompt
  construction (Section 3) should generate its dimension descriptions from
  short constants co-located with the TypeScript enum, not as freestanding
  prose duplicated in a template file, so a future category change can't
  update the type without also touching the prompt.

---

## 11. Recommended Implementation Sequence

1. Add `evidence: string` to `AnnotatedPoint` in `lib/verdict/types.ts` —
   the one type change this document identifies (Section 4).
2. Build `decision-engine.ts` and `output-validation.ts` as pure functions,
   unit-tested against hand-written fixtures — no engine wiring yet.
3. Build the hybrid engine (Section 8, Stage B): refactor the mock engine
   to fabricate raw findings and route them through the modules from step
   2, replacing its own ad hoc verdict/confidence/summary logic. Checkable
   entirely in-browser, at zero cost, per `docs/DEVELOPMENT_PLAN.md`'s
   existing checkpoint pattern.
4. Build `report-assembler.ts` on top of the hybrid engine's output,
   replacing the mock engine's remaining composition logic.
5. Add the deterministic regression fixture suite (Section 9) against the
   now-stable hybrid pipeline.
6. Only after 1–5 are solid, build `prompt.ts` and `openai-engine.ts`
   (Section 8, Stage C) per `docs/ROADMAP.md` Phase 2, reusing every
   module built in steps 2–5 unchanged.
7. Run the calibration suite against real sample creatives before flipping
   `VERDICT_ENGINE=openai` in any shared environment.
