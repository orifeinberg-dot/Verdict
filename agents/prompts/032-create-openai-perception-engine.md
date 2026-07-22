# Milestone 032 — Create the OpenAI Perception Engine

## Objective

Create the first concrete implementation of the `PerceptionEngine` interface for OpenAI.

This milestone establishes the runtime structure of the provider while remaining completely offline.

No SDKs, API calls, authentication, or network traffic are introduced.

Production behavior must remain unchanged.

---

## Background

Verdict now contains:

- PerceptionEngine interface
- Provider abstraction
- OpenAI prompt builder
- OpenAI response schema
- OpenAI response mapper

The missing component is the engine that will eventually orchestrate these pieces.

Future runtime:

Image
    ↓
OpenAIPerceptionEngine
    ↓
Prompt
    ↓
OpenAI API
    ↓
Mapper
    ↓
PerceptionResult

This milestone builds only the orchestration shell.

---

## Deliverables

### 1. Create

```
lib/verdict/openai/openai-perception.ts
```

---

### 2. Export

```ts
openAIPerceptionEngine
```

implementing

```ts
PerceptionEngine
```

---

### 3. Implement the pipeline skeleton

The implementation should clearly express the future flow:

```text
build prompt
↓

prepare image payload

↓

call provider

↓

map response

↓

return PerceptionResult
```

However:

- provider invocation should NOT exist yet;
- image preparation should be placeholder only;
- mapping should not execute because no provider response exists.

Instead, throw a deterministic

```ts
new Error(...)
```

indicating that the OpenAI provider has not yet been implemented.

The goal is architectural readability, not functionality.

---

### 4. Keep provider responsibilities isolated

Only this module should know about:

- prompt.ts
- schema.ts
- mapper.ts

No other layer should import those files.

---

## Constraints

Do NOT:

- install OpenAI SDK
- add environment variables
- perform network requests
- modify provider selection
- modify mock perception
- modify validation
- modify decision engine
- modify UI
- change runtime behavior

---

## Verification

Confirm:

- Type-check passes.
- Existing tests pass unchanged.
- The new engine implements PerceptionEngine.
- The new engine is not referenced by the provider.
- The application still uses mock perception.

---

## Definition of Done

- openai-perception.ts exists.
- openAIPerceptionEngine implements PerceptionEngine.
- Future pipeline is clearly expressed.
- Runtime throws deterministic "not implemented" error.
- Existing provider remains mock.
- Existing tests pass.
- No production behavior changes.