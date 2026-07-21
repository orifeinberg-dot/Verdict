# Milestone 023 — Add Evidence to the Verdict Domain Model

## Objective

Implement the first production change required by
`docs/INTELLIGENCE_IMPLEMENTATION_ARCHITECTURE.md`.

This milestone introduces the new `evidence` field into the Verdict domain
model and updates the existing mock engine to populate it.

No AI integration, decision engine, validation layer, or report assembly
changes are part of this milestone.

The goal is to establish the new report contract while preserving the
current behavior and UI.

---

# Background

Milestone 022 identified exactly one required change to the public report
types:

```
AnnotatedPoint.evidence: string
```

Every finding shown to the user should now include the concrete observation
that supports it.

The current mock engine fabricates findings without explicit evidence.

This milestone updates the domain model so that future implementation
milestones can rely on evidence being present everywhere.

---

# Required Reading

Documentation

- docs/VERDICT_INTELLIGENCE_FRAMEWORK.md
- docs/INTELLIGENCE_IMPLEMENTATION_ARCHITECTURE.md

Implementation

- lib/verdict/types.ts
- lib/verdict/mock-engine.ts
- components/verdict-report.tsx
- app/verdict/[id]/page.tsx

---

# Your Role

Act as:

- Senior TypeScript Engineer
- Product Engineer
- Technical Lead

Your priority is introducing the smallest possible production change that
supports future milestones.

Avoid unnecessary refactoring.

---

# Requirements

## 1. Update the public report model

Modify `AnnotatedPoint` to include:

```ts
evidence: string;
```

The field must be:

- required
- non-empty
- documented

No other public interfaces should change.

---

## 2. Update mock data generation

Every fabricated strength and weakness should include plausible evidence.

Evidence should represent an observable fact.

Good examples:

- "The CTA button is positioned below the fold."
- "The logo occupies approximately 3% of the image."
- "White text appears on a light gray background."

Avoid recommendations or conclusions.

---

## 3. Preserve report behavior

Current verdicts, confidence scores and recommendations should continue
behaving exactly as before.

The mock engine should simply provide richer findings.

---

## 4. Update the UI

Display evidence beneath each finding.

Requirements:

- visually secondary to the summary
- easy to scan
- consistent with existing Verdict styling
- no redesign
- responsive
- dark/light mode support

If no evidence exists (legacy reports), the UI should gracefully omit the
section.

---

## 5. Maintain backwards compatibility

Existing stored reports without evidence should not crash the application.

Handle missing evidence safely.

---

## 6. Validation

Ensure:

- TypeScript compiles
- Existing routes still work
- Demo route still works
- Mock reports render correctly

---

# Constraints

Do NOT:

- build the decision engine
- add OpenAI integration
- implement validation layer
- change verdict logic
- change confidence computation
- modify roadmap
- modify architecture documents

---

# Deliverables

Production code only.

No new documentation is required.

---

# Definition of Done

The milestone is complete only if:

- `AnnotatedPoint` contains required `evidence`
- mock strengths include evidence
- mock weaknesses include evidence
- existing verdict logic is unchanged
- UI displays evidence cleanly
- legacy reports continue rendering safely
- no unrelated refactoring occurred