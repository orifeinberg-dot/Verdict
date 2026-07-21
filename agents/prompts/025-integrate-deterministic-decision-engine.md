# Milestone 025 — Integrate the Deterministic Decision Engine

## Objective

Replace the mock engine's hardcoded verdict, confidence, anchor selection, and executive summary generation with the deterministic decision engine introduced in Milestone 024.

This milestone is strictly an integration milestone.

No new business logic should be introduced.

---

## Background

Milestone 024 introduced a deterministic decision engine containing the project's core reasoning logic:

- computeVerdict()
- computeConfidence()
- selectAnchorFinding()
- assembleExecutiveSummary()

These functions currently exist but are not yet used by the report generation pipeline.

The mock engine still contains duplicated logic that must now be removed.

---

## Deliverables

Update:

```
lib/verdict/mock-engine.ts
```

The report generation pipeline must become:

Generate findings
↓
Compute Verdict
↓
Compute Confidence
↓
Select Anchor Finding
↓
Assemble Executive Summary
↓
Return VerdictReport

---

## Required Changes

### 1. Import the deterministic engine

Import:

- computeVerdict()
- computeConfidence()
- selectAnchorFinding()
- assembleExecutiveSummary()

from:

```
lib/verdict/decision-engine
```

---

### 2. Compute the verdict

Replace every hardcoded or mock verdict with:

```ts
const verdict = computeVerdict(weaknesses);
```

---

### 3. Compute confidence

Replace any mock confidence generation with:

```ts
const confidence = computeConfidence(
    strengths,
    weaknesses,
    [
        "policy_risk",
        "legibility",
        "brand_consistency",
        "message_clarity",
    ]
);
```

For now, assume all four dimensions were evaluated.

This will become dynamic once the perception layer is implemented.

---

### 4. Select the anchor finding

Replace any previous anchor selection with:

```ts
const anchor = selectAnchorFinding(
    verdict,
    strengths,
    weaknesses
);
```

---

### 5. Generate the executive summary

Replace any template or random summary generation with:

```ts
const executiveSummary =
    assembleExecutiveSummary(
        verdict,
        anchor,
        context
    );
```

---

## Constraints

Do NOT:

- modify report types
- modify UI
- modify validation
- change mock finding generation
- introduce OpenAI
- add randomness
- refactor unrelated code

This milestone is wiring only.

---

## Definition of Done

- mock-engine delegates all business decisions to decision-engine
- no duplicated verdict logic remains
- no duplicated confidence logic remains
- no duplicated executive summary generation remains
- no duplicated anchor selection remains
- report generation still succeeds
- output remains deterministic