# Verdict — Architecture

## Guiding constraint

No database, no auth, no payments, one person maintaining it. The
architecture optimizes for "smallest thing that's still a real product,"
not for scale or extensibility that isn't needed. Every abstraction below
exists because a concrete, near-term requirement (the mock→real AI swap, or
the eventual add-a-backend swap) needs it — not speculatively.

## Shape of the system

A single Next.js application, three routes, no separate backend service:

- `/` — Landing. Static, no data.
- `/analyze` — Form + analyzing state (client-side state machine on one
  route; see below for why analyzing isn't its own route).
- `/verdict/[id]` — Verdict Report. Client Component that reads its data
  from the browser, not the server (see "Where the report actually lives").

```
Browser                              Next.js Server (same app)
┌───────────────────────┐            ┌───────────────────────────┐
│ /analyze               │  ------>  │ Server Action:              │
│  form -> analyzing      │  await    │  submitCreative(input)      │
│  (Client Component)     │  <------  │   -> VerdictEngine.analyze  │
└───────────┬─────────────┘  JSON     │      (mock | openai)        │
            │                         │   -> VerdictReport           │
            │ generate id                                            │
            │ save to ReportStore     └───────────────────────────┘
            │ (sessionStorage)
            ▼
┌───────────────────────┐
│ router.push            │
│ /verdict/[id]           │
│  reads ReportStore      │
│  (Client Component)     │
└───────────────────────┘
```

The server itself is stateless and holds nothing between requests — the
only thing that "persists" the report across the `/analyze` → `/verdict/[id]`
navigation is the browser, deliberately, per the decision below.

## Where the report actually lives (no database, but an id-based route)

`/verdict/[id]` reads like a resource that should be independently
resolvable — which is exactly the tension of adding an id-based route with
no database. Decision: **the report is written to `sessionStorage` in the
browser, keyed by a client-generated id, immediately before navigating to
`/verdict/[id]`.** The page itself is a Client Component that reads that id
from the URL, looks it up in `sessionStorage` on mount, and renders it.

Concretely:

```ts
// lib/report-store/types.ts
type StoredReport = {
  report: VerdictReport;
  image: { dataUrl: string; width: number; height: number };
  context: CreativeContext;
};

interface ReportStore {
  save(report: StoredReport): string; // returns a generated id
  load(id: string): StoredReport | null;
}
```

- `lib/report-store/session-storage-store.ts` — the MVP implementation.
  `save` generates an id (`crypto.randomUUID()`), writes the report as JSON
  to `sessionStorage`, and returns the id. `load` reads and parses it, or
  returns `null` if absent.
- This is the same pattern as `VerdictEngine` in reverse: one interface,
  one swappable implementation, isolated behind a single module. When a
  real backend eventually exists, only this implementation changes — to a
  version whose `save` POSTs to an API and whose `load` fetches by id
  server-side — and `/verdict/[id]`'s component shape barely changes.

**Honest limitation, stated plainly rather than hidden:** because the store
is `sessionStorage`, a report resolves only in the browser tab/session that
generated it. A copied `/verdict/[id]` link will not open on another device,
another browser, or after the session ends — `load` will return `null`, and
the page renders the "report not available" state from `UI_SPEC.md`. This
is a real constraint of building an id-based route without a database, not
an oversight, and it's the honest tradeoff of doing this right (an isolated,
swappable seam) instead of faking cross-session persistence in a way that
would just break confusingly later.

An in-memory server-side cache (a `Map` keyed by id, holding recent
reports) was considered and rejected for the MVP: on a stateless/serverless
deployment (see Deployment below), a request can land on a different
instance than the one that wrote the entry, so it would fail unpredictably
rather than fail honestly. It's not a safe substitute for real persistence,
so we don't pretend it is.

## Why the "Analyzing" state isn't its own route

The product spec describes four screens, but the Analyzing state stays on
`/analyze` rather than becoming e.g. `/analyze/[id]/status`. Reasoning: a
route only earns its own URL if there's something for it to resolve
against later (a bookmark, a refresh, a shared link). With no database and
no background job queue, there is nothing server-side for an in-progress
route to poll — the analysis is a single `await`ed call inside one page
load. Giving it a URL would require inventing an interim store for
not-yet-finished work (the same `sessionStorage` mechanism, but written
before the result even exists) purely to answer "is it done yet," which is
more machinery than a multi-second wait needs. If Phase 2's real model
calls ever grow slow enough to need resumability across a refresh, that's
the trigger to revisit this — not before.

## Why Server Actions over a separate API

This Next.js version's data-mutation model (`'use server'` functions
invoked directly from a Client Component) removes the need to hand-roll a
REST endpoint and a `fetch` call for what is fundamentally one action:
"submit creative + context, get a report." A Route Handler
(`app/api/verdict/route.ts`) is the fallback if the OpenAI phase needs to
stream partial results — plain Server Actions don't stream today. Decision:
**start with a Server Action; move to a Route Handler only if/when
streaming is actually needed** in the OpenAI phase. Don't build the
streaming-capable version first for a mock engine that returns instantly.

## The VerdictEngine abstraction

The other deliberate seam in the codebase, because it's the other thing we
know will be swapped out:

```ts
// lib/verdict/types.ts
type Verdict = "launch" | "test" | "dont_launch";

type AnnotatedPoint = {
  id: string;
  category: "policy_risk" | "legibility" | "brand_consistency" | "message_clarity";
  summary: string;
  boundingBox?: { x: number; y: number; width: number; height: number }; // % of image, approximate is fine
};

type Weakness = AnnotatedPoint & { blocking: boolean }; // drives verdict; not shown as a UI severity tier

type VerdictReport = {
  verdict: Verdict;
  confidence: number; // 0-100
  executiveSummary: string;
  strengths: AnnotatedPoint[];
  weaknesses: Weakness[];
  recommendations: string[];
};

type CreativeContext = {
  brandName: string;
  website: string;
  industry: string;
  campaignObjective: "awareness" | "traffic" | "conversions" | "app_installs";
  targetAudience?: string;
};

interface VerdictEngine {
  analyze(image: { dataUrl: string; width: number; height: number }, context: CreativeContext): Promise<VerdictReport>;
}
```

`blocking` on `Weakness` is an internal flag, not a UI concept — it's what
lets the engine's verdict logic reason about "does this weakness alone
justify Don't Launch" without resurrecting the old three-tier severity
scale the UI no longer shows (strengths/weaknesses are two-toned, per
`UI_SPEC.md`, not severity-colored).

Two implementations of `VerdictEngine`:

- `lib/verdict/mock-engine.ts` — deterministic-ish logic from image
  dimensions/aspect ratio and form fields (e.g., extreme aspect ratios
  nudge toward "Test"; a missing `targetAudience` slightly lowers
  confidence rather than changing the verdict). No network calls, no API
  key required. This is what ships first and what the entire UI is
  validated against.
- `lib/verdict/openai-engine.ts` (later phase) — sends the image (as a data
  URL) and a structured prompt built from `CreativeContext` to an OpenAI
  multimodal model, requests structured JSON output matching
  `VerdictReport` exactly, validates it, and returns it.

Selection between them is one line, gated by an environment variable:

```ts
// lib/verdict/index.ts
export const verdictEngine: VerdictEngine =
  process.env.VERDICT_ENGINE === "openai" ? openaiEngine : mockEngine;
```

The UI, the Server Action, and the types never change when this flips.
That's the entire point of the seam — resist the urge to add more
abstraction (plugin registries, strategy factories) around it. One `if`,
two files.

## Image handling — no storage, anywhere

- The browser reads the selected file with the File API and converts it to
  a data URL client-side for immediate preview — no round trip needed just
  to show a thumbnail.
- The same data URL is sent as part of the Server Action's input, and is
  also what gets written into the `ReportStore` entry alongside the report,
  so `/verdict/[id]` can re-render the same image without re-uploading it.
- The server never writes the image to disk, blob storage, or a database.
  It exists only in memory for the duration of the request.
- `sessionStorage` has practical size limits (typically ~5–10MB per
  origin). A single compressed JPEG/PNG creative comfortably fits; this is
  a reasonable MVP tradeoff, and worth revisiting only if the app starts
  accepting significantly larger source files than a typical ad creative.

This falls directly out of "no database": if we don't need to persist
images beyond one browser session, don't build any code path that could.

## Validation

Zod (or equivalent) schema for `CreativeContext` shared between the
`/analyze` form and the Server Action, so form validation and server-side
validation are the same source of truth. For the OpenAI phase, the same
approach validates the model's JSON output before it's trusted — never
render unvalidated model output directly into the report UI. The
`ReportStore`'s `load` should similarly validate what it reads back out of
`sessionStorage` before trusting it (defends against a stale shape from a
previous version of the app during local development).

**Image validation** happens in two places, doing different jobs:

- **Client-side, before analysis** (`components/upload-dropzone.tsx`): the
  first and cheapest gate. Checks file type (JPG/JPEG, PNG, WEBP) and size
  (≤10MB) synchronously from the `File` object, then loads it into an
  `Image`/`createImageBitmap` to catch unreadable/corrupted files and read
  actual dimensions — which also drives the soft warnings (unusual aspect
  ratio, low resolution) described in `PRODUCT_SPEC.md` and `UI_SPEC.md`.
  This exists purely for fast feedback; a user shouldn't wait on a round
  trip to learn their file is a corrupted upload.
- **Server-side, before AI processing** (Phase 2, alongside
  `openai-engine.ts`): the same hard checks (type, size, corruption) are
  re-run against the actual bytes received, never trusting the client's
  validation. This matters once a real model call has a cost per
  invocation — an oversized or corrupted image should be rejected before
  it reaches the OpenAI API, not after. The mock engine (Phase 1) has no
  cost pressure to justify this, so it relies on the client-side checks
  alone for now; add the server-side gate when the OpenAI phase begins.

Both layers should share the same constants (accepted MIME types, 10MB
limit) and checks from one module (`lib/validation.ts`) rather than
duplicating them.

## Environment & config

MVP (mock phase): no environment variables required at all — the app runs
with zero configuration, which is itself worth preserving as long as
possible.

OpenAI phase adds exactly:
- `OPENAI_API_KEY` — server-side only, never exposed to the client.
- `VERDICT_ENGINE=openai` — explicit opt-in switch, defaults to mock if
  unset, so the mock path always remains available for local dev/demo
  without needing an API key.

## Error handling

- Client-side: file type/size validation before submit, with inline
  messaging (see `UI_SPEC.md`).
- Server-side: the Server Action catches engine failures (including,
  later, OpenAI timeouts/rate limits/malformed JSON) and returns a typed
  error result rather than throwing across the server/client boundary. The
  client stays on `/analyze` and renders the "engine error" state — it
  never navigates to `/verdict/[id]` without a real report to save.
- `/verdict/[id]` handles a missing/unparseable `ReportStore` entry as a
  normal empty state (see `UI_SPEC.md`), not an error.
- No retries-with-backoff machinery for MVP — a single user-triggered
  retry button is enough at this scale.

## Deployment

A single stateless Next.js app deploys as-is to any Next.js-hosting
platform (e.g. Vercel) with zero infrastructure beyond the one environment
variable added in the OpenAI phase. No database to provision, no auth
provider to configure, no queue/worker system, and — per the decision
above — no server-side session store either. The absence of infrastructure
is a feature of this architecture, not a gap in it.

## Folder structure

```
app/
  page.tsx                    # Landing (/)
  layout.tsx
  analyze/
    page.tsx                  # form -> analyzing state machine (Client Component)
  verdict/
    [id]/
      page.tsx                # Verdict Report, reads ReportStore by id (Client Component)
  actions/
    submit-creative.ts        # 'use server' — calls verdictEngine.analyze
components/
  upload-dropzone.tsx
  context-form.tsx
  analyzing-state.tsx
  verdict-report.tsx
  annotated-image.tsx
lib/
  verdict/
    types.ts
    mock-engine.ts
    openai-engine.ts          # added in OpenAI phase
    index.ts                  # engine selection
  report-store/
    types.ts
    session-storage-store.ts
    index.ts                  # store selection (mirrors verdict/index.ts)
  schema.ts                   # zod schemas shared client/server
  validation.ts                # image validation: format/size/corruption checks + warning thresholds
```

Flat and shallow on purpose. No `services/`, `repositories/`, or `domain/`
layers — there are exactly two domain-level seams (`VerdictEngine`,
`ReportStore`), each warranting its own folder and nothing more.
