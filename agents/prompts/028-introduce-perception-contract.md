# Milestone 028 — Introduce the Perception Contract

## Objective

Introduce the domain contract that separates AI perception from deterministic reasoning.

This milestone creates the interface that every future perception implementation (mock, OpenAI, Claude, Gemini, etc.) must satisfy.

No AI integration is introduced.

No production behavior should change.

---

## Background

The Verdict pipeline currently consists of:

Generate findings
↓
Validate findings
↓
Decision Engine
↓
Verdict Report

The first stage ("Generate findings") is still embedded inside `mock-engine.ts`.

Before replacing it with an LLM, the project needs a stable perception interface.

The goal is to make every future perception provider interchangeable while preserving the deterministic validation and decision pipeline.

---

## Architectural Goal

After this milestone the architecture should conceptually become:

Perception Engine
↓
Validation Layer
↓
Decision Engine
↓
Presentation

The mock engine will continue to fabricate findings exactly as before, but it will now do so through a dedicated perception contract.

---

## Deliverables

### 1. Create a perception module

Create:

```
lib/verdict/perception.ts
```

---

### 2. Define the perception interface

Export:

```ts
export interface PerceptionEngine {
  perceive(
    image: CreativeImage,
    context: CreativeContext
  ): Promise<PerceptionResult>;
}
```

---

### 3. Define the perception result

Export:

```ts
export interface PerceptionResult {
  strengths: AnnotatedPoint[];
  weaknesses: Weakness[];
  recommendations: string[];
}
```

The perception layer produces observations only.

It does not produce:

- verdict
- confidence
- executive summary

---

### 4. Move mock perception behind the interface

Move the existing fabricated finding generation into a dedicated implementation:

```
mock-perception.ts
```

(or another appropriately named file within `lib/verdict/`)

The implementation should continue producing exactly the same findings and recommendations.

No probabilities, templates, or generation behavior should change.

---

### 5. Update mock-engine

`mock-engine.ts` should become an orchestrator.

Its responsibility becomes:

```text
Perceive
↓
Validate
↓
Compute verdict
↓
Compute confidence
↓
Select anchor
↓
Assemble summary
↓
Return report
```

The mock engine should no longer fabricate findings itself.

---

## Constraints

Do NOT:

- integrate OpenAI
- integrate Claude
- modify validation
- modify decision-engine
- modify report types
- modify UI
- modify probabilities
- modify finding templates
- change recommendations
- introduce randomness
- refactor unrelated modules

This milestone is an architectural extraction only.

---

## Definition of Done

- `PerceptionEngine` interface exists.
- `PerceptionResult` exists.
- Mock perception implements the interface.
- `mock-engine.ts` delegates perception.
- Report output remains unchanged.
- Validation still runs before the decision engine.
- Decision engine remains untouched.
- No production behavior changes.