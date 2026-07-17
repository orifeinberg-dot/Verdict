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
| **Don't Launch** | Has a critical issue — likely policy violation, illegible/broken layout, off-brand execution, or a mismatch with the stated campaign goal severe enough that spend would likely be wasted. Must fix before launch. |

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
- Confident, not apologetic — a "Don't Launch" verdict states the critical
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
   framing). On a strength, this same category renders as **Policy
   compliance** instead — "Policy risk" reads as a contradiction next to a
   positive finding, so the label (not the underlying category) flips
   depending on whether the point lands in Strengths or Weaknesses.
2. **Legibility / layout** — text too small, low contrast, key element
   cropped or obscured, cluttered composition.
3. **Brand consistency** — logo, color, or tone mismatch with the stated
   brand description.
4. **Message clarity** — value proposition or CTA is unclear or missing
   given the stated campaign objective.

### "Critical issue" terminology

The internal `blocking` flag on a `Weakness` (does this alone justify a
"Don't Launch" verdict?) is never shown to the user under that name. Where
the report needs to communicate it, the user-facing language is:

- **Critical issue** — the label.
- **Must fix before launch** — the explanatory phrase, used where more
  context helps (e.g. the executive summary for a "Don't Launch" verdict).

This applies to generated copy only; it doesn't change verdict logic or
weaken how plainly a genuinely launch-preventing issue is stated.

## Analyze form

Minimal by design — enough for the model (or mock data) to reason about fit,
not a brand-guidelines upload system.

| Field | Type | Required | Purpose |
|---|---|---|---|
| Static creative | image upload | yes | The thing being reviewed |
| Brand | text | yes | Used in the executive summary and brand-consistency checks |
| Website | URL | no | Grounds the model in the real brand in the AI-integration phase — not required since the mock engine doesn't meaningfully use it yet |
| Industry | text | yes | Context for what's normal/expected in this category |
| Campaign objective | select (Awareness / Traffic / Conversions / App installs) | yes | Anchors message-clarity checks against the stated funnel goal |
| Campaign Type | select (Evergreen / Promotion / Product Launch / Retargeting / Brand Awareness / Other) | yes | Anchors expectations for tone, urgency, and content — e.g. a Promotion creative is expected to show a price or offer in a way an Evergreen creative isn't |
| Occasion | select, shown only for certain Campaign Types — see below | no | Grounds seasonal/timeliness checks when the campaign is tied to a specific date or event |
| Target audience | short text | no | Sharper tone/relevance checks if provided |

Reasoning: every required field maps directly to something the verdict
engine can use. If a field doesn't change what the engine can say, it
doesn't belong in the form.

### Campaign objective vs. Campaign Type

These two fields sit next to each other in the form on purpose — they
answer related but distinct questions, and placing them adjacently is
what makes the distinction legible to the user rather than reading as a
duplicate question:

- **Campaign objective** is Meta's funnel/optimization goal: what the
  campaign is optimizing for (Awareness, Traffic, Conversions, App
  installs). This is the standard Meta ads objective taxonomy.
- **Campaign Type** is the strategic/content category the creative
  belongs to: Evergreen, Promotion, Product Launch, Retargeting, Brand
  Awareness, or Other. This is about *what kind of campaign moment* this
  is, independent of what it's optimizing for — a Promotion campaign can
  be optimizing for Conversions or Traffic; a Product Launch can be
  optimizing for Awareness or Conversions.

**Promotion** is deliberately broad: it covers sales, discounts,
limited-time offers, and holiday or seasonal promotions alike. Earlier
revisions of this spec had separate Sale, Holiday, and Seasonal options,
but all three overlapped conceptually with Promotion and exposed the same
Occasion choices, so they were folded in — the specific event or season,
if any, belongs in Occasion instead (see below).

A creative's Campaign Type shapes what the verdict engine should
*expect* to see (a Promotion creative that shows no price, offer, or
urgency cue is a plausible message-clarity weakness; the same absence on
an Evergreen or Brand Awareness creative isn't). Campaign objective alone
can't carry that distinction, which is why both fields exist rather than
folding one into the other.

### Occasion

Conditional field — only shown when Campaign Type is Promotion or Other,
since those are the only campaign types plausibly tied to a specific date
or event. It stays hidden for Evergreen, Product Launch, Retargeting, and
Brand Awareness, where an occasion is rarely meaningful and asking anyway
would just add clutter.

Options: None, Black Friday, Cyber Monday, Christmas, Valentine's Day,
Mother's Day, Father's Day, Back to School, New Year, Summer Sale, Spring
Sale, Other.

Optional even when shown, defaulting to **None** — not every Promotion or
Other-type campaign is tied to a specific occasion, and the field
shouldn't block submission just because it's visible. "Other" here does
not get a follow-up free-text field in this pass — it's a plain,
unqualified option, matching Campaign Type's own "Other."

### Legacy Campaign Type values

Reports saved to sessionStorage before this simplification may still
contain `campaignType: "sale" | "holiday" | "seasonal"`. These are not
offered to new submissions, but the report store and display labels
explicitly recognize all three so an old report still loads and renders
a readable "Sale"/"Holiday"/"Seasonal" label rather than crashing or
showing blank/undefined text. See `lib/verdict/types.ts`'s
`LegacyCampaignType` and `lib/report-store/session-storage-store.ts`.

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
