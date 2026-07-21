# Milestone 024 — Build the Deterministic Decision Engine

## Objective

Implement the deterministic decision engine defined in
`docs/INTELLIGENCE_IMPLEMENTATION_ARCHITECTURE.md`.

This milestone introduces the pure functions responsible for computing:

- verdict
- confidence
- anchor finding
- executive summary

No engine integration is part of this milestone.

No OpenAI code.

No validation layer.

No report assembly.

The goal is to build the product's reasoning layer as independently
testable software.

---

# Background

Milestone 021 defined Verdict's reasoning methodology.

Milestone 022 defined the implementation architecture.

Milestone 023 updated the public report model with evidence.

This milestone implements the first piece of the deterministic reasoning
pipeline.

These functions should have no knowledge of:

- prompts
- APIs
- storage
- UI
- session state
- networking

Every function must be pure.

---

# Required Reading

Documentation

- docs/VERDICT_INTELLIGENCE_FRAMEWORK.md
- docs/INTELLIGENCE_IMPLEMENTATION_ARCHITECTURE.md

Implementation

- lib/verdict/types.ts
- lib/verdict/mock-engine.ts

---

# Your Role

Act as:

- Senior TypeScript Engineer
- Backend Architect
- Product Engineer

Your responsibility is to build the deterministic reasoning layer exactly
as specified in the architecture.

Prefer clarity over cleverness.

---

# Requirements

## 1. Create decision-engine.ts

Create:

```
lib/verdict/decision-engine.ts
```

Implement only pure functions.

No classes.

No side effects.

---

## 2. Implement computeVerdict()

Implement the deterministic verdict algorithm defined in the framework.

Inputs:

- validated weaknesses

Output:

- Launch
- Test
- Don't Launch

Behavior must exactly match the framework.

---

## 3. Implement computeConfidence()

Implement deterministic confidence calculation.

Inputs:

- strengths
- weaknesses
- covered dimensions

Output:

```
number
```

Do not invent AI confidence.

Only deterministic confidence.

Document the algorithm.

---

## 4. Implement selectAnchorFinding()

Implement deterministic selection of the finding that drives the report.

Rules:

Don't Launch

↓

critical weakness

Test

↓

most important notable weakness

Launch

↓

strongest strength

Document tie-breaking behavior.

---

## 5. Implement assembleExecutiveSummary()

Create a deterministic summary generator.

It should produce concise marketer-oriented summaries.

Do not use templates copied from the mock engine.

Instead, implement a reusable deterministic generator based on:

- verdict
- anchor finding
- campaign context

---

## 6. Documentation

Every exported function must include:

- purpose
- inputs
- outputs

Explain the reasoning where appropriate.

---

## 7. Unit-testability

Functions must:

- have no dependencies on engines
- have no dependencies on storage
- have no dependencies on UI
- have deterministic output

---

# Constraints

Do NOT:

- modify mock-engine.ts
- integrate these functions
- create validation layer
- add OpenAI code
- modify report assembler
- modify Server Actions
- modify UI

This milestone creates only the deterministic library.

---

# Deliverables

Production code only.

Expected file:

```
lib/verdict/decision-engine.ts
```

No documentation updates.

---

# Definition of Done

The milestone is complete only if:

- decision-engine.ts exists
- every function is pure
- computeVerdict implemented
- computeConfidence implemented
- selectAnchorFinding implemented
- assembleExecutiveSummary implemented
- no engine wiring exists
- no production behavior changes
- no unrelated files modified