# Verdict — Development Plan

This is the build order for **Phase 1 (Mock MVP)** from `ROADMAP.md`,
broken into small milestones. Each milestone should leave the app in a
runnable, visually-checkable state — avoid a long stretch of invisible
plumbing work. Phase 2 (OpenAI integration) gets its own plan once Phase 1
is done, since its details depend on what's learned building the mock
engine.

Stack already scaffolded in the repo: Next.js (App Router) + TypeScript +
Tailwind + React. No new dependencies should be needed for Phase 1 beyond
a schema validator (e.g. `zod`) — confirm with the user before adding it,
per project convention.

## Current status (as of this revision)

Milestones 1–7 are implemented: real `VerdictEngine`/`ReportStore`,
the Server Action, `/analyze`'s submit flow wired to real data, and a
polished `/verdict/[id]` report page with synced annotation hotspots.
Milestone 8 is partially done (light/dark mode and inline error states
ship; a full copy pass does not).

**New gap as of this revision:** `PRODUCT_SPEC.md`, `UI_SPEC.md`, and
`ARCHITECTURE.md` now document two new `CreativeContext` fields —
Campaign Type (required) and Occasion (conditional) — that are **not
yet implemented in code**. The next implementation prompt touching
`/analyze` or the data model needs to:

- `lib/verdict/types.ts` — add the `CampaignType` and `Occasion` unions
  and the two new `CreativeContext` fields, per `ARCHITECTURE.md`.
- `app/analyze/analyze-workspace.tsx` — add the two new form fields
  (Campaign Type required; Occasion conditional on Campaign Type, per
  `UI_SPEC.md`'s show/hide rule), including the conditional
  show/hide logic and the `None` default for Occasion.
- `app/actions/submit-creative.ts` — extend the required-field check to
  include `campaignType`.
- `lib/report-store/session-storage-store.ts` — extend the hand-rolled
  `isStoredReport` type guard to validate the two new fields (`occasion`
  optional, `campaignType` required) so a stale/malformed session entry
  from before this change still fails closed to `null` rather than
  rendering a partially-typed report.
- `lib/verdict/mock-engine.ts` — optionally incorporate `campaignType`/
  `occasion` into the copy templates for added realism (e.g. flagging a
  missing price/offer on a Sale or Promotion creative); not required for
  correctness, but the field otherwise does nothing observable in the
  mock phase.

## Milestone 1 — Types and mock engine (no UI)

Build the domain model first so the UI has a real contract to render
against, instead of designing screens around imaginary data.

- `lib/verdict/types.ts` — `VerdictReport`, `AnnotatedPoint`, `Weakness`,
  `CreativeContext`, `VerdictEngine` interface, exactly as in
  `ARCHITECTURE.md`.
- `lib/schema.ts` — zod schema for `CreativeContext` (and `VerdictReport`,
  reused later for validating OpenAI output).
- `lib/verdict/mock-engine.ts` — implement `MockVerdictEngine`. Write it to
  deliberately produce all three verdicts, a spread of confidence scores,
  and varying numbers of strengths/weaknesses/recommendations depending on
  input, so later UI work has real variety to check against, not one
  canned response.
- Sanity-check the engine with a throwaway script or a couple of unit
  tests (see Testing Strategy) before touching any UI.

Checkpoint: calling `mockEngine.analyze(...)` with a few different fake
inputs produces distinct, sensible `VerdictReport` objects.

## Milestone 2 — ReportStore

Independent of Milestone 1's engine work, so it can be built in either
order, but needed before the Analyze page can navigate anywhere.

- `lib/report-store/types.ts` — `StoredReport`, `ReportStore` interface,
  per `ARCHITECTURE.md`.
- `lib/report-store/session-storage-store.ts` — `save` generates an id via
  `crypto.randomUUID()`, JSON-stringifies into `sessionStorage`; `load`
  parses and validates what comes back (via the zod schema), returning
  `null` on anything missing or malformed.
- `lib/report-store/index.ts` — the store-selection seam, mirroring
  `lib/verdict/index.ts` (defaults to, and for Phase 1 only ever is, the
  sessionStorage implementation).

Checkpoint: `save(...)` followed by `load(id)` in a scratch script (or
browser console) round-trips a fake report correctly, and `load` on a
made-up id returns `null` without throwing.

## Milestone 3 — Server Action wiring

- `app/actions/submit-creative.ts` — `'use server'` function that
  validates input with the zod schema, calls `verdictEngine.analyze`, and
  returns a typed result (success or typed error, per `ARCHITECTURE.md`).
- `lib/verdict/index.ts` — the engine-selection seam (defaults to mock;
  the `VERDICT_ENGINE` env var branch can be written now even though
  `openai-engine.ts` doesn't exist yet — just don't wire it live).

Checkpoint: a Server Action can be invoked from a throwaway test page and
returns a `VerdictReport`.

## Milestone 4 — Landing page (`/`)

The simplest screen and has no dependencies on anything above — good to
knock out early for momentum, or in parallel if pairing.

- `app/page.tsx` — hero headline, supporting sentence, single "Analyze a
  Creative" CTA linking to `/analyze`.

Checkpoint: page reads as a finished, premium landing page on its own,
even with `/analyze` not built yet (link can 404 briefly).

## Milestone 5 — Analyze page: form state

- `app/analyze/page.tsx` — route shell, client-side state machine
  (`idle | analyzing | error`).
- `lib/validation.ts` — shared image validation: accepted MIME types
  (JPG/JPEG, PNG, WEBP), 10MB max size, corrupted-image detection, and
  aspect-ratio/resolution warning thresholds, per `PRODUCT_SPEC.md`. Used
  by the upload dropzone now and reusable server-side in Phase 2 (see
  `ARCHITECTURE.md`).
- `components/upload-dropzone.tsx` — drag/drop + click-to-browse, client-
  side preview via File API. Runs `lib/validation.ts` on selection:
  hard-blocks unsupported type/oversized/corrupted files (inline error,
  per `UI_SPEC.md`) and surfaces non-blocking inline warnings for unusual
  aspect ratio or low resolution.
- `components/context-form.tsx` — the context fields from
  `PRODUCT_SPEC.md` (Brand, Website, Industry, Campaign objective,
  Campaign Type, Occasion — conditional, see `UI_SPEC.md` — Target
  audience), client-validated against the shared zod schema, progressive
  disclosure (hidden until an image is present, per `UI_SPEC.md`).

Checkpoint: form fully validates and enables/disables the "Analyze" button
correctly; nothing submits yet.

## Milestone 6 — Analyze page: analyzing state + navigation

- `components/analyzing-state.tsx` — the premium loading treatment and
  rotating status lines from `UI_SPEC.md`, including the artificial
  minimum-duration hold so it doesn't flash instantly given how fast the
  mock engine returns.
- Wire "Analyze" to call the Milestone 3 Server Action, then on success:
  call `reportStore.save(...)` (Milestone 2) and `router.push` to
  `/verdict/[id]` with the returned id. On failure: transition to the
  inline error state on `/analyze` instead (never navigate without a real
  report to show).

Checkpoint: submitting a real image + filled form ends with the browser
sitting on a `/verdict/[id]` URL for a route that doesn't render anything
meaningful yet (confirm via dev tools that `sessionStorage` holds the
report under that id).

## Milestone 7 — Verdict page

The most detail-sensitive milestone — budget the most time here.

- `app/verdict/[id]/page.tsx` — reads the id from the route params,
  `reportStore.load(id)` on mount; renders the "report not available"
  state (per `UI_SPEC.md`) if `null`.
- `components/annotated-image.tsx` — renders the image at natural aspect
  ratio with percentage-positioned, kind-colored markers; hover/click state
  lifted to a shared parent so it can sync with the strengths/weaknesses
  lists.
- `components/verdict-report.tsx` — verdict badge + confidence, executive
  summary, strengths list, weaknesses list, recommendations list, "Analyze
  another creative" and "Copy summary" actions.
- Wire bidirectional hover/selection sync between markers and list rows.

Checkpoint: every mock-engine output variant (from Milestone 1's varied
test inputs) renders correctly — check a report with zero weaknesses, one
with many of both, and the "report not available" state (clear
`sessionStorage` and load the route directly), since these are the layout
edge cases most likely to break.

## Milestone 8 — Polish pass

- Light/dark mode via `prefers-color-scheme`.
- Mobile layout (single column, per `UI_SPEC.md`'s breakpoint) across all
  three routes.
- Invalid-file and engine-error states on `/analyze`.
- Copy pass on the landing page and executive summaries — these are the
  first and most-read text in the product, worth deliberate wordsmithing
  rather than placeholder text.

Checkpoint: run through the full flow (`/` → `/analyze` → `/verdict/[id]`)
on both a narrow mobile viewport and desktop, in both color schemes,
including at least one error path and the "report not available" path.

## Testing strategy

Kept intentionally light, matching the project's scope:

- Unit tests for `MockVerdictEngine` logic (deterministic input →
  expected verdict/confidence/category shape) — this is the piece of real
  logic most likely to silently regress.
- Unit tests for `SessionStorageReportStore`'s `save`/`load` round-trip,
  including the malformed/missing-data → `null` path.
- Unit tests for the zod schemas (valid input passes, invalid input is
  rejected with expected errors).
- Unit tests for `lib/validation.ts` (hard checks: unsupported type,
  oversized, corrupted; soft checks: unusual aspect ratio, low
  resolution).
- No end-to-end test framework for Phase 1 — manual walkthroughs per
  milestone checkpoint above are sufficient at this scale. Revisit if
  Phase 2's added complexity (real API calls, retries) warrants it.
- Per project convention: run existing tests before declaring any
  milestone complete, and never delete a test to make a build pass.

## Definition of done for Phase 1

- All eight milestones checked off and verified in-browser (not just
  type-checked/tested).
- The app requires zero environment variables to run locally.
- A cold `npm install && npm run dev` produces a fully working demo across
  all three routes.
