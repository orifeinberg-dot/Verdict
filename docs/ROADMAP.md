# Verdict — Roadmap

This roadmap is phased so each phase is independently shippable and
demoable. Do not start a phase until the previous one is genuinely done —
a polished mock-engine MVP is a better portfolio artifact than a half-wired
AI integration.

## Phase 0 — Product & design spec (this phase)

Deliverables: `PRODUCT_SPEC.md`, `UI_SPEC.md`, `ARCHITECTURE.md`,
`DEVELOPMENT_PLAN.md`. No code. Done when the four documents describe a
coherent, buildable product with no open decisions left for "figure it out
while coding."

## Phase 1 — Mock MVP (the core deliverable)

The entire product, fully designed and functional, backed by the mock
verdict engine. This is the version that should be portfolio-ready on its
own, before any AI integration exists.

Scope:
- Landing page (`/`).
- Analyze page (`/analyze`): upload + context form, and the in-place
  analyzing state.
- Verdict page (`/verdict/[id]`) with working visual annotations and
  strengths/weaknesses list-to-marker sync.
- `MockVerdictEngine` producing varied, plausible reports (all three
  verdict types, a range of confidence scores, mixed strength/weakness
  counts) so the UI can be evaluated against real variety, not one
  hardcoded example.
- `ReportStore` (sessionStorage-backed) carrying a report from `/analyze`
  to `/verdict/[id]`, including the "report not available" fallback state.
- Light/dark mode, mobile layout, error/invalid-file states.

Done when: a stranger can use the app without instructions and believe
it's a real (if simple) product.

## Phase 2 — OpenAI vision integration

Swap in `OpenAiVerdictEngine` behind the existing `VerdictEngine`
interface. No UI changes should be required if Phase 1's seam was built
correctly — this phase is the test of that.

Scope:
- Prompt design that maps `CreativeContext` + image into the exact
  `VerdictReport` JSON shape (verdict, confidence, executive summary,
  categorized strengths/weaknesses with hotspots, recommendations).
- Structured output validation (reject/retry on malformed model JSON).
- Hotspot accuracy is the hard part — plan for a calibration pass (test
  against a handful of real ad creatives with known issues) rather than
  assuming the model's coordinates are usable on the first try. The MVP's
  "approximate is fine" bar (`PRODUCT_SPEC.md`) sets expectations
  appropriately here — don't over-invest in pixel-perfect precision before
  confirming the model can even get the right region.
- Latency handling: real model calls take seconds, not milliseconds — the
  "Analyzing" screen's status-line rotation becomes load-bearing UX here
  rather than cosmetic.
- Cost/rate-limit awareness: no per-user quota is needed (no auth), but a
  basic safeguard against abuse (e.g. file size cap, simple rate limiting
  by IP at the edge) is worth adding once the app makes real API calls.

Done when: real creatives produce sensible, well-grounded verdicts and
findings at least as good as the mock engine's polish, with the same UI.

## Phase 3 — Stretch goals (only after Phase 2 is solid)

Not committed scope — candidates to consider only if Phases 1–2 leave
room, and each should be re-evaluated against the "does this serve the
portfolio goal" test before starting:

- Multiple creative variants compared side-by-side in one report.
- Export the Verdict Report as a shareable image or PDF.
- A short "why this matters" explainer per category, for users unfamiliar
  with Meta ad policy.
- Basic Meta ad policy text lookup to ground policy-risk findings in cited
  language rather than the model's general knowledge.
- **True cross-session sharing of a `/verdict/[id]` link.** This is the one
  stretch goal `ARCHITECTURE.md`'s `ReportStore` seam was specifically
  built to absorb: swap the sessionStorage-backed implementation for one
  backed by a real datastore, and the route/page shape barely changes.
  Still explicitly out of scope unless this roadmap phase is reached —
  don't build it preemptively.

Explicitly deferred indefinitely, not just "later": accounts, saved
history, a database, payments, team features, non-Meta platforms, video
creatives. These would change the product's category (from a focused
reviewer tool to a SaaS platform) and are out of scope for what this
project is trying to demonstrate.
