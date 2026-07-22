# Milestone 033 — Create the OpenAI Client Abstraction

## Objective

Introduce a thin client abstraction that encapsulates all future communication with the OpenAI SDK.

This milestone prepares the architecture for real API integration while remaining completely offline.

No SDK is installed.

No network calls occur.

Production behavior remains unchanged.

---

## Background

Current architecture:

OpenAIPerceptionEngine
        ↓
build prompt
        ↓
prepare image
        ↓
throw "not implemented"

Future architecture:

OpenAIPerceptionEngine
        ↓
OpenAIClient
        ↓
OpenAI SDK
        ↓
OpenAI API

The engine should never know SDK-specific details.

---

## Deliverables

### 1. Create

```
lib/verdict/openai/client.ts
```

---

### 2. Define

```ts
export interface OpenAIClient
```

with a single async method:

```ts
analyzeCreative(request): Promise<OpenAIPerceptionResponse>
```

The request type should capture only the data the client actually needs (prompt text, image payload, response schema). Do not expose SDK-specific request objects.

---

### 3. Stub implementation

Export:

```ts
export const openAIClient: OpenAIClient
```

whose implementation throws a deterministic:

```ts
new Error("OpenAI client has not been implemented.")
```

No SDK imports.

---

### 4. Update the perception engine

Refactor `openai-perception.ts` so it delegates provider communication to `openAIClient.analyzeCreative(...)` instead of its internal provider stub.

The orchestration flow should now be:

build prompt
↓

prepare image payload
↓

openAIClient.analyzeCreative(...)
↓

mapOpenAIResponse(...)
↓

return PerceptionResult

---

## Constraints

Do NOT:

- install the OpenAI SDK
- add API keys
- add environment variables
- perform network requests
- change provider selection
- modify validation
- modify decision engine
- modify UI
- modify mock perception

---

## Verification

Confirm:

- type-check passes
- lint passes
- existing tests pass
- provider remains mock
- no SDK dependency exists
- no runtime behavior changes

---

## Definition of Done

- client.ts exists
- OpenAIClient interface exists
- openAIClient stub exists
- perception engine delegates through the client
- no SDK imports
- no network activity
- application behavior unchanged