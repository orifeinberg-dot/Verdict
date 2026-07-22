# Milestone 029 — Add the Perception Provider Abstraction

## Objective

Introduce the provider abstraction that will allow Verdict to support multiple AI perception backends.

This milestone does not integrate OpenAI or any external model.

Its goal is to define how future AI providers plug into the existing PerceptionEngine contract.

Production behavior must remain unchanged.

---

## Background

Milestone 028 established:

PerceptionEngine
↓
Validation
↓
Decision Engine
↓
Presentation

The only existing implementation is:

```
mockPerceptionEngine
```

Before introducing a real AI model, Verdict needs a provider layer so that multiple perception implementations can coexist behind a common interface.

Examples of future providers include:

- OpenAI Vision
- Claude Vision
- Gemini Vision
- Local models
- Mock provider (current)

The deterministic pipeline must remain completely unaware of which provider generated the observations.

---

## Architectural Goal

After this milestone:

```
PerceptionProvider
        ↓
PerceptionEngine
        ↓
Validation
        ↓
Decision Engine
```

The orchestrator should depend only on the PerceptionEngine interface.

---

## Deliverables

### 1. Create a provider module

Create:

```
lib/verdict/perception-provider.ts
```

---

### 2. Define provider selection

Expose a function similar to:

```ts
getPerceptionEngine(): PerceptionEngine
```

The provider should currently return:

```
mockPerceptionEngine
```

No runtime configuration is required yet.

---

### 3. Update the orchestrator

Replace any direct dependency on:

```
mockPerceptionEngine
```

with:

```ts
getPerceptionEngine()
```

The orchestrator should no longer know which implementation it receives.

---

### 4. Keep provider logic isolated

Future provider selection should be centralized in the provider module.

No provider-specific branching should appear elsewhere.

---

## Constraints

Do NOT:

- integrate OpenAI
- integrate Claude
- introduce environment variables
- introduce dependency injection frameworks
- add configuration files
- modify validation
- modify decision-engine
- modify report types
- modify UI
- modify business logic
- modify probabilities
- modify templates
- change deterministic behavior
- refactor unrelated modules

This milestone introduces only the provider abstraction.

---

## Verification

Confirm:

- identical inputs still produce identical reports;
- all existing tests pass unchanged;
- mock remains the active provider;
- the orchestrator has no direct dependency on mockPerceptionEngine.

---

## Definition of Done

- Provider module exists.
- getPerceptionEngine() exists.
- Provider currently returns mockPerceptionEngine.
- mock-engine.ts depends only on the provider.
- No business logic changes.
- All existing tests pass.
- Report output remains identical.