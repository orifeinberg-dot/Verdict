# Verdict — Product Spec

## What this is

Verdict is a single-purpose tool: upload a static Meta ad creative, describe the
brand and campaign context, and get a fast, opinionated verdict — **Launch**,
**Test**, or **Don't Launch** — with visual annotations pointing at exactly what's
wrong on the image itself.

It is a portfolio project. The goal is a small, coherent, well-designed product
that demonstrates product thinking and execution quality, not a startup. Every
feature added should earn its place against that goal.

## Problem

Marketers and founders producing static ad creative get feedback late (after
spend) or not at all (no one on the team knows Meta ad policy or performance
patterns well enough to review). Existing tools either check policy compliance
only, or give generic "best practices" advice with no reference to the specific
image in front of you.

## Who this is for

One primary persona: a solo marketer or small-business owner who designed (or
had someone design) a static image ad for Meta and wants a second opinion
before spending money on it. They are not a design expert. They want a clear
answer, not a wall of caveats.

## Non-goals (explicitly out of scope for MVP)

- Video or carousel creatives — static image only.
- User accounts, saved history, or teams — no auth, no database.
- Payments or billing.
- Actually publishing to Meta or reading real account/campaign data.
- A/B test tracking or real performance prediction — this is a pre-launch
  reviewer, not an analytics product.
- Multi-platform support (Google, TikTok, etc.) — Meta only, to keep the
  judging rubric coherent.

Reasoning: each of these is a believable "wouldn't it be nice" feature. None of
them are required to prove the core idea — that an AI can look at an ad and a
brand's context and produce a specific, defensible verdict. Adding any of them
before the core loop is excellent would dilute the portfolio piece rather than
strengthen it.

## Core user flow

The MVP is four screens, each with a single responsibility, connected by
real navigation rather than in-place state swaps:

1. **Landing (`/`)** — introduces Verdict and its value proposition with one
   CTA, "Analyze a Creative." No login, no other navigation.
2. **Analyze (`/analyze`)** — a focused workspace: upload the creative, fill
   the brand/context form (see below), submit.
3. **Analysis** — a full-screen loading state, still on `/analyze`, while the
   creative is evaluated. Not a distinct route (see `ARCHITECTURE.md` for why).
4. **Verdict (`/verdict/[id]`)** — a dedicated page presenting the full
   Verdict Report: verdict, confidence score, executive summary, strengths,
   weaknesses, recommendations, and the creative annotated with visual
   hotspots.

Giving the verdict its own URL (rather than replacing the contents of
`/analyze` in place) is a deliberate product decision: it reads as a more
finished, product-like result rather than a form re-rendering itself, gives
each screen one job, and leaves the door open for later features (saved
reports, sharing) to attach to that route without any restructuring — even
though the MVP itself has no database and does not implement those features.
See `ARCHITECTURE.md` for how the report reaches that page without a backend.

Nothing is saved server-side between sessions. A Verdict Report currently
only resolves in the browser session that generated it — see
`ARCHITECTURE.md` for the specific, honest limitation this implies for
sharing a `/verdict/[id]` link today.

## The Verdict

Every report resolves to exactly one of three states. No numeric score is
presented as the headline — the three-way verdict is the product's voice.

| Verdict | Meaning |
|---|---|
| **Launch** | No material issues found. Creative is consistent with policy and stated goals. |
| **Test** | Workable, but has specific fixable issues or open questions worth an A/B test or a second look before committing full budget. |
| **Don't Launch** | Has a blocking issue — likely policy violation, illegible/broken layout, off-brand execution, or a mismatch with the stated campaign goal severe enough that spend would likely be wasted. |

Each Verdict Report is backed by:
- A **confidence score** (0–100) — how sure the engine is in the verdict
  itself, kept separate from the verdict so the two can't be confused (a
  "Test" verdict can be delivered with high confidence).
- An **executive summary** — a few plain-language sentences giving the "why"
  behind the verdict, written to be read on its own without the rest of the
  report.
- A **strengths** list — specific things the creative does well.
- A **weaknesses** list — specific things that hold it back or put it at
  risk, up to and including anything that would make the verdict
  "Don't Launch."
- A **recommendations** list — concrete, actionable next steps, distinct
  from weaknesses (a weakness names a problem; a recommendation names what
  to do about it).
- **Visual annotations**: strengths and weaknesses are each tied to a
  hotspot on the creative where applicable. Approximate placement is
  acceptable for the MVP — exact pixel-perfect bounding boxes are a
  refinement for the AI-integration phase, not a requirement now.

Strengths and weaknesses both carry a category tag (see below) so the user
can tell *why* something matters, not just that it does.

### Voice and tone

Every piece of generated text — executive summary, strength/weakness
explanations, recommendations — should read like a specific, opinionated
note from a senior growth marketer who actually looked at this creative,
not generic AI-assistant output. Concretely:

- Plain, direct sentences. No hedging ("might potentially," "it's possible
  that"), no disclaimers, no "as an AI" framing.
- Specific to the creative and the stated context, not generic
  best-practices copy that could apply to any ad — reference what's
  actually on the image (e.g. "the CTA button blends into the background"
  beats "make sure your CTA stands out").
- Short sentences over long ones. The executive summary should read in one
  breath.
- Confident, not apologetic — a "Don't Launch" verdict states the blocking
  issue plainly rather than softening it into a suggestion.

This applies equally to the mock engine's copy templates and, later, the
system prompt for the OpenAI phase — both are expressions of the same
voice, not independent copywriting exercises.

## Categories

Keeping categories few and fixed makes both the mock data and the future
model prompt tractable. The same four categories apply to both strengths
and weaknesses:

1. **Policy risk** — likely to be rejected or restricted by Meta ad review
   (e.g., excessive text on image, prohibited claims language, before/after
   framing).
2. **Legibility / layout** — text too small, low contrast, key element
   cropped or obscured, cluttered composition.
3. **Brand consistency** — logo, color, or tone mismatch with the stated
   brand description.
4. **Message clarity** — value proposition or CTA is unclear or missing
   given the stated campaign objective.

## Analyze form

Minimal by design — enough for the model (or mock data) to reason about fit,
not a brand-guidelines upload system.

| Field | Type | Required | Purpose |
|---|---|---|---|
| Static creative | image upload | yes | The thing being reviewed |
| Brand | text | yes | Used in the executive summary and brand-consistency checks |
| Website | URL | yes | Grounds the model in the real brand in the AI-integration phase |
| Industry | text | yes | Context for what's normal/expected in this category |
| Campaign objective | select (Awareness / Traffic / Conversions / App installs) | yes | Anchors message-clarity checks |
| Target audience | short text | no | Sharper tone/relevance checks if provided |

Reasoning: every required field maps directly to something the verdict
engine can use. If a field doesn't change what the engine can say, it
doesn't belong in the form.

## Image requirements and validation

The creative upload is the one required field with real failure modes, so
it gets explicit rules rather than "whatever the browser happens to accept."

**Accepted formats:** JPG/JPEG, PNG, WEBP.

**Maximum file size:** 10MB.

**Supported creative shapes:** Verdict targets static Meta ad formats
specifically:
- 1:1 square
- 4:5 portrait
- 9:16 vertical
- 1.91:1 landscape

**Hard validation** — blocks submission, shown as an inline error (see
`UI_SPEC.md`):
- Unsupported file type
- File larger than 10MB
- Unreadable/corrupted image

**Soft warnings** — shown inline, but analysis still proceeds:
- Unusual aspect ratio (outside the four shapes above)
- Low resolution
- Image too small for reliable review

Don't over-block in the MVP: a valid-but-not-ideal image should still be
analyzable, with a clear warning attached, rather than rejected outright.
This mirrors the product's broader stance of giving an opinionated
verdict, not acting as a rigid gatekeeper.

## Mock verdict, then real AI

The MVP ships with a **mock verdict engine**: deterministic or lightly
randomized logic that produces plausible, well-formed Verdict Reports from
the uploaded image's basic properties (dimensions, file size, aspect ratio)
and the form input — no model call. This validates the entire UI, data
contract, and report design before any AI cost or latency enters the picture.

OpenAI vision (GPT-4o/GPT-4.1-class multimodal model) is integrated in a
later phase behind the exact same interface the mock engine implements, so
swapping one for the other touches no UI code. See `ARCHITECTURE.md`.

## Success criteria for the MVP

- A first-time user can go from landing page to a Verdict Report in under
  60 seconds with no explanation needed.
- The report is legible and convincing as a design artifact even when
  backed by mock data — it should look like a real product, not a demo.
- The codebase stays small enough that one person can hold the whole thing
  in their head.
