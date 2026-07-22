# Milestone 030 — Create the OpenAI Perception Contract

## Objective

Define the contract between Verdict and a future OpenAI Vision provider.

This milestone introduces no API calls.

Its purpose is to establish exactly what the AI will receive and exactly what it must return.

Production behavior must remain unchanged.

---

## Background

Verdict now has the following architecture:

Perception Provider
        ↓
Perception Engine
        ↓
Validation
        ↓
Decision Engine
        ↓
Presentation

The provider currently returns the mock implementation.

Before integrating a real vision model, the project needs a stable AI contract.

---

## Architectural Goal

Future architecture:

```
OpenAI Provider
        ↓
Prompt Builder
        ↓
GPT Vision
        ↓
Structured Response
        ↓
PerceptionResult
```

This milestone creates the first two building blocks.

---

## Deliverables

### 1. Create:

```
lib/verdict/openai/
```

---

### 2. Add:

```
prompt.ts
```

Export:

```ts
buildPerceptionPrompt(
    context: CreativeContext
): string
```

The prompt should be deterministic.

It must describe:

- Verdict's role
- evaluation dimensions
- expected observations
- required output format

Do not include image-specific information.

The image will later be supplied separately.

---

### 3. Add:

```
schema.ts
```

Define the expected structured response shape for the AI.

The schema should directly map onto:

```
PerceptionResult
```

Do not include:

- verdict
- confidence
- executive summary

---

### 4. Documentation

Document:

- prompt responsibilities
- schema responsibilities
- why business logic must never exist inside prompts

---

## Constraints

Do NOT:

- call OpenAI
- install SDKs
- add API keys
- modify providers
- modify orchestrator
- modify validation
- modify decision engine
- modify report types
- modify UI

---

## Definition of Done

- openai directory exists
- prompt builder exists
- schema exists
- no runtime behavior changes
- deterministic prompt
- schema mirrors PerceptionResult
- documentation added