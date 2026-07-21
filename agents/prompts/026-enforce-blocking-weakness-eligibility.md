# Milestone 026 — Enforce Blocking Weakness Eligibility

## Objective

Introduce the first deterministic validation rule in the Verdict intelligence pipeline.

The validation layer must ensure that only weaknesses from eligible categories can carry:

```ts
blocking: true
```

This milestone addresses the validation gap documented after Milestone 025, where the mock generator could assign a blocking flag to a `brand_consistency` weakness.

The decision engine must continue to trust validated input and must not perform category validation itself.

---

## Architectural Context

The report-generation pipeline currently behaves as follows:

```text
Generate findings
        ↓
Compute verdict
        ↓
Compute confidence
        ↓
Select anchor finding
        ↓
Assemble executive summary
```

This milestone adds an explicit validation boundary:

```text
Generate findings
        ↓
Validate findings
        ↓
Compute verdict
        ↓
Compute confidence
        ↓
Select anchor finding
        ↓
Assemble executive summary
```

The validation layer owns input correction.

The decision engine remains responsible only for deterministic reasoning over already-valid findings.

---

## Blocking Eligibility Rule

Only weaknesses in the following categories may carry:

```ts
blocking: true
```

Eligible categories:

- `policy_risk`
- `legibility`
- `message_clarity`

The following category is not eligible:

- `brand_consistency`

If an ineligible weakness arrives with:

```ts
blocking: true
```

the validation layer must normalize it to:

```ts
blocking: false
```

The weakness itself must remain in the report.

Its category, summary, evidence, ID, and bounding box must remain unchanged.

---

## Deliverables

### 1. Create the validation module

Create:

```text
lib/verdict/validation.ts
```

Export:

```ts
validateWeaknesses(
  weaknesses: Weakness[]
): Weakness[]
```

The function must:

- return a validated weakness array;
- preserve the original array order;
- preserve every weakness;
- preserve all fields except an invalid blocking flag;
- normalize ineligible `blocking: true` values to `blocking: false`;
- leave eligible blocking weaknesses unchanged;
- avoid mutating the input array;
- avoid mutating the original weakness objects;
- behave deterministically.

---

### 2. Define blocking-category eligibility centrally

The validation module should contain a clearly named eligibility definition or helper, such as:

```ts
const BLOCKING_ELIGIBLE_CATEGORIES
```

or:

```ts
isBlockingEligibleCategory()
```

The rule must exist in one place inside the validation layer.

Do not duplicate the category rule inside `mock-engine.ts` or `decision-engine.ts`.

---

### 3. Integrate validation into the mock engine

Update:

```text
lib/verdict/mock-engine.ts
```

After findings have been generated, validate the weakness array before any decision-engine function is called.

The pipeline should follow this order:

```ts
const validatedWeaknesses = validateWeaknesses(weaknesses);

const verdict = computeVerdict(validatedWeaknesses);

const confidence = computeConfidence(
  strengths,
  validatedWeaknesses,
  CATEGORIES
);

const anchor = selectAnchorFinding(
  verdict,
  strengths,
  validatedWeaknesses
);
```

The returned report must also use:

```ts
weaknesses: validatedWeaknesses
```

Recommendations should correspond to the validated weaknesses.

Because this milestone changes only the blocking flag, recommendation text and count should otherwise remain unchanged.

---

## Mutation Requirements

Validation must not mutate the original findings.

Avoid code such as:

```ts
weakness.blocking = false;
```

Return a new array.

Create a new weakness object only when normalization is necessary.

Unchanged weakness objects may retain their existing references.

---

## Constraints

Do NOT:

- modify `decision-engine.ts`;
- add category validation to `computeVerdict()`;
- remove an invalid weakness;
- throw an error for an invalid blocking flag;
- modify strengths;
- modify report types;
- modify UI;
- introduce OpenAI;
- introduce schema-validation libraries;
- add broader evidence or summary validation;
- change mock finding probabilities;
- change mock finding templates;
- refactor unrelated code.

This milestone implements one validation rule only.

---

## Expected Behavior

Given:

```ts
[
  {
    category: "brand_consistency",
    blocking: true,
    // remaining fields
  },
]
```

validation must return an equivalent weakness with:

```ts
blocking: false
```

Given:

```ts
[
  {
    category: "policy_risk",
    blocking: true,
    // remaining fields
  },
]
```

validation must preserve:

```ts
blocking: true
```

Given a non-blocking weakness from any category, validation must leave it unchanged.

---

## Definition of Done

- `lib/verdict/validation.ts` exists.
- `validateWeaknesses()` is exported.
- Blocking eligibility is defined centrally in the validation module.
- Invalid blocking flags are normalized to `false`.
- Eligible blocking flags remain unchanged.
- No weaknesses are removed.
- Input arrays and objects are not mutated.
- `mock-engine.ts` validates weaknesses before invoking the decision engine.
- The returned report contains the validated weaknesses.
- `decision-engine.ts` remains unchanged.
- Existing report generation continues to succeed.
- The validation behavior is deterministic.