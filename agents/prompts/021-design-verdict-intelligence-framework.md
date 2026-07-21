# 021 - Design the Verdict Evaluation Methodology

## Objective

Design the methodology that will eventually power Verdict's AI evaluations.

This is a **documentation-only** task.

Do not implement any code.

---

## Background

Verdict currently ships with a mock evaluation engine, not a real model. Before
connecting a real LLM (`docs/ROADMAP.md`'s Phase 2), the evaluation
methodology itself — what gets judged, how a verdict is reached, what the
model contract looks like — needs to be designed deliberately rather than
inherited unexamined from the mock engine's placeholder logic.

Before proposing anything, read:

- `docs/ROADMAP.md`, especially **Phase 2 — OpenAI vision integration**
- `docs/PRODUCT_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_PLAN.md`
- `lib/verdict/types.ts` (the current `VerdictReport` schema)
- `lib/verdict/mock-engine.ts` (the current mock evaluation logic)

---

## Your Role

Act as a cross-functional panel consisting of:

- Senior Creative Strategist for Meta advertising
- Senior Performance Marketing Lead
- AI Product Architect
- Staff UX Writer
- Product Design Lead

The objective is an evaluation framework that is:

- commercially useful
- consistent
- explainable
- concise
- visually grounded
- trustworthy
- deterministic enough to become software

---

## Guiding Principle: Prefer Simplicity

Where a trade-off exists between a more comprehensive methodology and a
simpler one, prefer whichever option is:

- easier to explain to a non-expert user,
- easier to implement consistently,
- easier to maintain over time.

This applies throughout Parts 1–6 — when choosing dimensions, decision
logic, schema fields, or report structure, default to the simpler option
unless the added complexity demonstrably changes a Launch / Test / Don't
Launch outcome. This reinforces Verdict's product philosophy — opinionated,
minimal, and highly usable — over one that is merely theoretically more
comprehensive.

---

## Requirements

### Part 1 — Critique

Review the current mock evaluation logic (`lib/verdict/mock-engine.ts`).

Identify:

- strengths
- weaknesses
- hidden assumptions
- missing concepts
- unnecessary complexity
- anything that would make real AI outputs inconsistent

---

### Part 2 — Evaluation Framework

Design the complete evaluation framework.

Answer: **what exactly should Verdict evaluate?**

Avoid creating an exhaustive marketing checklist. Instead identify the
smallest set of dimensions that explain almost every Launch / Test / Don't
Launch decision. Do not preserve the existing categories merely for
backward compatibility — if a simpler or stronger framework is justified,
propose it.

For every dimension explain:

- purpose
- observable evidence
- common strengths
- common weaknesses
- whether it deserves image annotations
- whether it can become critical

**Reconciliation requirement:** explicitly state whether the proposed
dimensions replace, rename, merge, or extend the current
`AnnotationCategory` values in `lib/verdict/types.ts`:

- `policy_risk`
- `legibility`
- `brand_consistency`
- `message_clarity`

Also reconcile the framework with the existing campaign-type and occasion
signal logic in `lib/verdict/mock-engine.ts` (`CAMPAIGN_TYPE_SIGNALS`,
`OCCASION_SIGNALS`) — explain whether that strategic-fit layer survives,
merges into the dimension set, or is superseded.

---

### Part 3 — Decision Logic

Design deterministic verdict logic.

How should Verdict reach Launch, Test, or Don't Launch?

Avoid vague scoring. Prefer decision trees or deterministic rules.

Explain:

- override conditions
- conflicting signals
- uncertainty handling
- campaign context interaction

---

### Part 4 — Report Philosophy

Critique the current report.

Should it become:

- more concise
- more opinionated
- more educational
- more actionable
- less repetitive
- more evidence-driven

Recommend improvements without increasing complexity.

---

### Part 5 — AI Contract

Review the current `VerdictReport` schema (`lib/verdict/types.ts`).

The recommended schema must be fully consistent with the dimensions and
decision logic defined in Parts 2 and 3: field names, category values, and
severity/critical concepts should match exactly, not introduce parallel or
conflicting terminology. If Part 2 concludes the `AnnotationCategory`
values should change, Part 5 must reflect that same change — not a
different one.

Recommend:

- fields to keep
- fields to remove
- fields to add
- validation rules
- evidence requirements
- deterministic post-processing

Do not redesign the UI.

---

### Part 6 — Risks

List the biggest product risks before connecting a real LLM. Include:

- hallucinations
- false confidence and confidence calibration
- contradictory findings
- annotation ambiguity
- inconsistent severity
- weak or insufficient evidence quality
- campaign-context dependence

---

## Constraints

- Documentation only — no production code changes.
- Do not implement, wire up, or stub a real model or OpenAI integration.
- Do not modify `lib/verdict/types.ts` or any other source file — schema
  changes are a recommendation for a future implementation milestone, not
  a change made now.
- Do not update `docs/ROADMAP.md` or `docs/DEVELOPMENT_PLAN.md` as part of
  this task. They are required reading, not files to edit — if this work
  implies a change to either, note it under Open Questions instead.
- Assume the existing UI is correct; do not redesign it unless the
  evaluation framework genuinely requires it.
- The only permanent artifact this task produces is
  `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md`.

---

## Deliverables

Save the completed framework to:

`docs/VERDICT_INTELLIGENCE_FRAMEWORK.md`

The document should end with:

1. Recommended methodology
2. Open questions
3. Risks
4. Suggested implementation sequence

Your final response (not the document) should briefly summarize the
conclusions and confirm that `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` was
created.

---

## Definition of Done

- `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` exists and covers Parts 1–6.
- The dimension set is explicitly reconciled against the current
  `AnnotationCategory` values and the campaign-type/occasion signal logic.
- The Part 5 AI Contract uses the same dimension names, category values,
  and decision concepts defined in Parts 2 and 3 — no parallel or
  conflicting terminology.
- Where a trade-off was made, the simpler option was chosen unless a
  specific, stated outcome required otherwise.
- No production code, `docs/ROADMAP.md`, or `docs/DEVELOPMENT_PLAN.md` was
  changed — `docs/VERDICT_INTELLIGENCE_FRAMEWORK.md` is the only file
  created or modified.
- The document is ready to drive a follow-up implementation prompt for
  Phase 2 (OpenAI vision integration).
