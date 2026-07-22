# Milestone 035 — Implement the OpenAI Client Transport

## Objective

Install the official OpenAI JavaScript SDK and replace the inert OpenAI client stub with a real, isolated transport implementation.

The client should:

- lazily resolve OpenAI configuration;
- construct the OpenAI SDK client;
- submit the prompt and image through the Responses API;
- request output matching `PERCEPTION_RESPONSE_JSON_SCHEMA`;
- parse the returned JSON;
- return `OpenAIPerceptionResponse`.

The active Verdict perception provider must remain mock.

No live API request should be made during implementation or automated verification.

---

## Background

Current architecture:

```text
OpenAIPerceptionEngine
        ↓
OpenAIClient stub
        ↓
throws "not implemented"
```

Target architecture:

```text
OpenAIPerceptionEngine
        ↓
OpenAIClient
        ↓
resolveOpenAIConfig()
        ↓
OpenAI SDK Responses API
        ↓
structured JSON response
        ↓
OpenAIPerceptionResponse
        ↓
mapOpenAIResponse()
```

The OpenAI subsystem remains inactive because `perception-provider.ts` still selects `mockPerceptionEngine`.

---

## Deliverables

### 1. Install the official SDK

Install:

```text
openai
```

Use the project’s existing package manager.

Do not install:

- Zod;
- third-party OpenAI wrappers;
- retry libraries;
- schema-conversion libraries;
- HTTP libraries.

The project already has a plain JSON Schema contract and does not need Zod for this integration.

---

### 2. Modify

```text
lib/verdict/openai/client.ts
```

Replace the throwing implementation with a real SDK-backed implementation.

Preserve the SDK-agnostic public boundary:

```ts
export interface OpenAIClient {
  analyzeCreative(
    request: AnalyzeCreativeRequest
  ): Promise<OpenAIPerceptionResponse>;
}
```

Do not expose OpenAI SDK request or response types through this public interface.

---

### 3. Use the existing configuration boundary

Resolve configuration lazily inside `analyzeCreative()`:

```ts
const config = resolveOpenAIConfig();
```

Do not resolve configuration:

- at module import;
- in a top-level exported singleton;
- during application startup while the mock provider is active.

Use the resolved configuration for:

- API key;
- model;
- timeout;
- maximum retries;
- maximum output tokens.

Do not read `process.env` directly anywhere else in the client.

Do not log configuration or API keys.

---

## SDK construction

The SDK instance must also be created lazily.

Importing `client.ts` must not:

- require environment variables;
- instantiate a configured SDK client;
- perform network activity.

Use the configuration values supported by the installed SDK for:

- `apiKey`;
- request timeout;
- maximum retries.

Do not manually implement retry loops or timeout wrappers if the SDK already supports those policies.

---

## Request contract

Refine `AnalyzeCreativeRequest.imagePayload` from `unknown` into the smallest SDK-agnostic type needed to represent an image accepted by the Responses API.

Prefer a contract equivalent to:

```ts
export interface OpenAIImagePayload {
  imageUrl: string;
}
```

`imageUrl` may later contain either:

- a supported data URL; or
- an externally accessible image URL.

The internal request type must not expose SDK-specific image types.

Update `openai-perception.ts` only as much as needed to satisfy this refined image-payload contract.

Image conversion itself remains outside this milestone. If `prepareImagePayload()` is still a placeholder, it may continue throwing a deterministic not-implemented error or returning its existing placeholder shape, depending on the current implementation. Do not invent a browser upload pipeline in this milestone.

---

## OpenAI request

Use the OpenAI Responses API.

The request should contain one user message with:

1. the built perception prompt as text;
2. the creative as image input.

Use the model supplied by `OpenAIConfig`.

Request structured output using:

```text
PERCEPTION_RESPONSE_JSON_SCHEMA
```

Use a stable schema name such as:

```text
verdict_perception
```

Enable strict schema adherence when supported by the installed SDK/API contract.

Use `maxOutputTokens` through the corresponding Responses API request field.

Do not configure:

- temperature;
- tools;
- web search;
- conversation state;
- background mode;
- streaming;
- store/persistence;
- fallback models.

This should remain one model request per creative analysis.

---

## Parsing the response

Extract the model’s final text output using the SDK’s supported Responses API helper or typed response fields.

Then:

1. confirm that non-empty output text exists;
2. parse it with `JSON.parse`;
3. return it as `OpenAIPerceptionResponse` only after defensive structural validation.

Do not merely write:

```ts
return JSON.parse(output) as OpenAIPerceptionResponse;
```

A TypeScript assertion does not validate untrusted API data.

---

## Minimal response validation

Implement a small provider-boundary parser or type guard that checks the raw value before returning it.

At minimum, verify:

- the root is a non-null object;
- `strengths` is an array;
- `weaknesses` is an array;
- `recommendations` is an array;
- recommendation entries are strings;
- each finding has:
  - a string `category`;
  - a string `summary`;
  - a string `evidence`;
- each weakness additionally has a boolean `blocking`;
- an optional bounding box, when present, has finite numeric:
  - `x`;
  - `y`;
  - `width`;
  - `height`.

Do not perform domain business validation here.

In particular, do not:

- narrow categories into `AnnotationCategory`;
- enforce blocking eligibility;
- assign IDs;
- compute verdicts;
- modify recommendation order.

Those remain mapper and deterministic-pipeline responsibilities.

Malformed provider output must throw a deterministic, descriptive provider-response error.

Do not include:

- API keys;
- full prompts;
- image data URLs;
- complete model output

in error messages.

---

## Error boundaries

Preserve useful SDK errors without leaking sensitive request content.

Add deterministic errors for application-owned failure cases such as:

- no output text returned;
- output is not valid JSON;
- parsed JSON does not match the raw response contract.

Use stable messages that tests can assert without depending on SDK wording.

Do not catch and relabel every SDK error as a generic error. Authentication, rate-limit, timeout, and server errors should retain their original SDK error identity unless sanitization is required.

---

## Testability

Automated tests must not make network calls.

Introduce the smallest private or exported-for-testing dependency seam needed to inject or mock the SDK transport.

Acceptable approaches include:

- a factory function that accepts an SDK-compatible transport;
- a private creator with module mocking;
- a narrowly typed internal transport interface.

Do not expose the full SDK through Verdict’s application-facing interface.

Avoid global mutable test hooks.

---

## Tests

Create:

```text
lib/verdict/openai/client.test.ts
```

Add focused tests covering:

1. Importing the client does not resolve configuration.
2. Importing the client does not instantiate the SDK.
3. Valid request construction:
   - configured model;
   - text prompt;
   - image input;
   - JSON Schema structured output;
   - strict mode;
   - maximum output tokens.
4. SDK construction receives:
   - API key;
   - timeout;
   - maximum retries.
5. A valid structured response is parsed and returned.
6. Recommendation ordering and duplicates are preserved.
7. Missing output text throws the expected deterministic error.
8. Invalid JSON throws the expected deterministic error.
9. Structurally invalid JSON throws the expected deterministic error.
10. Invalid nested finding fields are rejected.
11. Invalid weakness `blocking` values are rejected.
12. Invalid bounding-box numbers are rejected.
13. SDK errors propagate without being replaced by an unrelated generic error.
14. No test performs real network activity.
15. Secrets, prompts, image payloads, and complete model output do not appear in application-owned error messages.

Use fake configuration and a mocked/injected SDK transport.

Do not depend on a developer’s `.env` file.

---

## Scope boundaries

The client owns:

- lazy SDK construction;
- translating Verdict’s client request into an SDK request;
- making the provider request;
- extracting output text;
- parsing JSON;
- validating the raw provider-response shape.

The client does not own:

- prompt composition;
- image conversion from browser files;
- category narrowing;
- ID generation;
- business validation;
- verdict calculation;
- provider selection;
- UI error presentation.

---

## Constraints

Do not:

- modify `perception-provider.ts`;
- activate `openAIPerceptionEngine`;
- add provider-selection environment variables;
- make a live API request;
- add an API key to the repository;
- create or commit a real `.env` file;
- modify `validation.ts`;
- modify `decision-engine.ts`;
- modify mock perception;
- modify UI;
- add fallback models;
- add multiple LLM calls;
- add telemetry or logging;
- expand the milestone into browser image preparation.

Permitted existing-file changes are limited to:

- `lib/verdict/openai/client.ts`;
- `lib/verdict/openai/openai-perception.ts`, only if needed for the refined image payload type;
- `package.json`;
- the package lockfile.

New implementation or test helpers should remain inside:

```text
lib/verdict/openai/
```

---

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
npx vitest run
```

Confirm:

- all prior 84 tests still pass;
- new client tests pass;
- no test sends network traffic;
- `perception-provider.ts` remains unchanged;
- `getPerceptionEngine()` still returns `mockPerceptionEngine`;
- importing OpenAI modules without environment variables remains safe;
- no secrets or real API keys exist in tracked files;
- the application’s current behavior remains unchanged.

Also inspect the installed SDK’s actual TypeScript definitions before finalizing request fields. Follow the installed version rather than forcing stale example syntax.

---

## Definition of Done

- The official `openai` SDK is installed.
- The OpenAI client stub is replaced with a real transport implementation.
- SDK construction and configuration resolution are lazy.
- The Responses API is used.
- The request contains one text input and one image input.
- The existing JSON Schema is supplied as strict structured output.
- Model, timeout, retries, and output-token policy come from `OpenAIConfig`.
- Returned text is parsed and structurally validated.
- Application-owned parsing errors are deterministic and secret-safe.
- Automated tests use no network.
- The active provider remains mock.
- Existing tests continue to pass.
- Current application behavior remains unchanged.