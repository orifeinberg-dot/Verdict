# Milestone 031 — Implement the OpenAI Response Mapper

## Objective

Implement the provider-specific mapper that converts a raw OpenAI perception response into the application's domain model (`PerceptionResult`).

This milestone introduces no API calls.

Its purpose is to establish the boundary between external provider data and Verdict's internal domain objects.

Production behavior must remain unchanged.

---

## Background

The current architecture is:

Perception Provider
        ↓
Perception Engine
        ↓
Validation
        ↓
Decision Engine

Milestone 030 introduced the provider-facing contract:

OpenAI Response
        ↓
OpenAIPerceptionResponse

The missing step is converting that raw response into the domain model consumed by the deterministic pipeline.

Future architecture:

OpenAI Response
        ↓
OpenAIResponseMapper
        ↓
PerceptionResult
        ↓
Validation
        ↓
Decision Engine

---

## Deliverables

### 1. Create

```
lib/verdict/openai/mapper.ts
```

---

### 2. Export

```ts
mapOpenAIResponse(
    response: OpenAIPerceptionResponse
): PerceptionResult
```

---

### 3. Responsibilities

The mapper should:

- assign application-owned IDs;
- convert RawFinding → AnnotatedPoint;
- convert RawWeakness → Weakness;
- preserve summaries;
- preserve evidence;
- preserve blocking proposals;
- preserve recommendation ordering;
- preserve bounding boxes unchanged.

Do NOT perform business validation.

---

### 4. Category narrowing

Convert category strings into the domain AnnotationCategory.

If an unknown category is encountered:

- fail deterministically with a descriptive error.

Do not silently coerce.

Do not invent fallback categories.

---

### 5. Keep validation separate

The mapper should not:

- enforce blocking eligibility;
- compute verdicts;
- compute confidence;
- generate summaries;
- normalize recommendations.

Its sole responsibility is transforming provider data into domain objects.

---

## Constraints

Do NOT:

- integrate OpenAI
- add SDKs
- modify validation.ts
- modify decision-engine.ts
- modify mock perception
- modify providers
- modify UI
- introduce network calls

---

## Verification

Add focused unit tests covering:

- successful mapping;
- ID generation;
- category narrowing;
- unknown category rejection;
- recommendation preservation;
- bounding-box preservation.

These tests should not depend on OpenAI or network access.

---

## Definition of Done

- mapper.ts exists.
- mapOpenAIResponse() exists.
- Raw responses convert into PerceptionResult.
- IDs are application-owned.
- Unknown categories fail deterministically.
- Validation responsibilities remain unchanged.
- New tests pass.
- Existing tests continue to pass.
- No production behavior changes.