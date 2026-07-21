# Verdict — Intelligence Framework

This document is the output of Milestone 021
(`agents/prompts/021-design-verdict-intelligence-framework.md`): a
documentation-only design of the methodology that will power Verdict's AI
evaluations once a real model replaces `lib/verdict/mock-engine.ts`. It was
produced by a cross-functional panel — Senior Creative Strategist (Meta
advertising), Senior Performance Marketing Lead, AI Product Architect,
Staff UX Writer, Product Design Lead — reviewing the current codebase
(`lib/verdict/types.ts`, `lib/verdict/mock-engine.ts`,
`components/verdict-report.tsx`) against `docs/PRODUCT_SPEC.md`,
`docs/UI_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_PLAN.md`, and
`docs/ROADMAP.md`'s Phase 2.

No code, `lib/verdict/types.ts`, `docs/ROADMAP.md`, or
`docs/DEVELOPMENT_PLAN.md` were changed to produce this document. The
existing UI (`docs/UI_SPEC.md`) is treated as correct throughout.

**Guiding principle — prefer simplicity.** Everywhere this document faces a
trade-off between a more comprehensive mechanism and a simpler one, it
picks the simpler one unless the added complexity demonstrably changes a
Launch / Test / Don't Launch outcome. This is not a stylistic preference —
it's the same reasoning `docs/PRODUCT_SPEC.md` already applies to the
product's scope ("every feature added should earn its place") applied to
the evaluation methodology itself.

---

## 1. Critique of the Current Mock Evaluation Logic

### Strengths

- **Deterministic per input.** `hashString` + `mulberry32` mean the same
  brand/image/context always produces the same report — good for demos,
  regression checks, and reasoning about the system at all.
- **Shared vocabulary.** Strengths and weaknesses both draw from the same
  four `AnnotationCategory` values, and campaign-fit findings
  (`CAMPAIGN_TYPE_SIGNALS`, `OCCASION_SIGNALS`) are already tagged
  `message_clarity` rather than living in a fifth, undocumented category —
  a good instinct this framework formalizes in Section 2.
- **`blocking` kept internal.** The mock engine already separates its
  internal launch-blocking flag from user-facing language (`"Critical
  issue"` / `"Must fix before launch"`, per `docs/PRODUCT_SPEC.md`) — a
  precedent worth keeping as real model output arrives.
- **Copy voice matches spec.** Templates are specific-sounding and
  unhedged, consistent with `docs/PRODUCT_SPEC.md`'s "Voice and tone" —
  useful as a style reference for the eventual system prompt.

### Weaknesses, hidden assumptions, and missing concepts

- **The verdict is decided before the evidence exists — this is the single
  biggest issue.** `determineVerdict(rng, aspectRatio)` runs first and
  produces the verdict from little more than a coin flip nudged by aspect
  ratio; `strengths`/`weaknesses` are generated afterward and only loosely
  shaped to match (`weaknessCount` and `blocking` both branch on the
  already-chosen `verdict`). A real evaluator must run this backwards:
  evidence in, verdict out. Section 3 makes this the framework's central
  rule.
- **Aspect ratio is functionally the only real signal.** Brand, industry,
  campaign type/objective, and the image's actual content have no causal
  effect on `determineVerdict`'s roll — today's "evaluation" isn't
  evaluating the creative at all. This is expected for a mock, but it
  means none of the mock's internal branching logic should be assumed to
  generalize; the framework below is derived from the product spec, not
  extrapolated from the mock.
- **`blocking` is assigned by a second random roll**
  (`index === 0 || rng() > 0.6`), not by anything about a finding's actual
  content — there is no current definition of "critical" beyond "the
  verdict happened to roll Don't Launch." Section 3 gives this a
  principled, evidence-based definition.
- **Confidence has no relationship to the evidence.** `confidenceRange`
  keys purely on verdict, with one deterministic adjustment for a missing
  `targetAudience`. A report with zero weaknesses and one with three can
  land at similar confidence. Section 5 makes confidence a function of
  evidence coverage and agreement instead of a second independent guess.
- **`CampaignSignal` is a structurally separate finding-generation path**
  with its own templates and its own random strength/weakness coin flip
  (`buildCampaignSignalPoint`), even though every entry is already tagged
  `category: "message_clarity"`. This is unnecessary complexity: a second
  parallel mechanism producing findings for a category that already has
  one. Section 2 recommends folding it in.
- **Category selection for generic findings is uniform-random**
  (`pick(rng, CATEGORIES)`) — there's no concept of coverage (does every
  dimension get addressed?) or of one dimension mattering more for a
  specific creative. The framework needs an explicit position on this
  (Section 2).
- **Bounding boxes are fully random** (`randomBoundingBox`) — "visually
  grounded" doesn't yet mean anything mechanically. Section 2 defines
  which dimensions are inherently spatial; Section 5 makes evidence,
  not decoration, the requirement for drawing one.
- **No evidence field exists.** A finding is one freeform `summary`
  sentence — nothing distinguishes "this is visibly true of the image"
  from "this is a plausible-sounding inference." This is the schema gap
  Section 5 closes, and it's the framework's primary defense against
  Section 6's hallucination risk.
- **Recommendations are a rigid 1:1 transform of weaknesses**
  (`weaknesses.map(...)`) through a second, smaller template pool keyed
  on the same category — always exactly one recommendation per weakness,
  never fewer, never synthesized, never present without a matching
  weakness. Section 4 flags the resulting restate-the-problem pattern as
  the report's main repetition to fix.
- **The executive summary narrates array position, not importance** —
  `strengths[0]` / `weaknesses[0]`, not "the finding that actually drove
  the verdict." Since finding order is effectively random today, the
  headline sentence of the report is arbitrary. Section 4 ties it to the
  finding that drove the computed verdict instead.
- **No structured decision rationale exists anywhere** — only prose. For a
  system meant to be "deterministic enough to become software," the
  decision needs an inspectable trace (which findings drove it), not just
  a narrated guess. Section 3 provides one.

---

## 2. Evaluation Framework

**What exactly should Verdict evaluate?** The panel's answer: the same
four dimensions already encoded as `AnnotationCategory` in
`lib/verdict/types.ts` — they were well-chosen, and adding a fifth would
violate the brief's own instruction to avoid an exhaustive checklist. The
one structural change recommended is folding the campaign-type/occasion
strategic-fit logic into `message_clarity` explicitly, rather than
carrying it as a parallel mechanism.

### Reconciliation with `AnnotationCategory`

**The four values are retained unchanged, in name and definition:**
`policy_risk`, `legibility`, `brand_consistency`, `message_clarity`. This
is not preserved for backward compatibility's sake — the panel considered
splitting `legibility` (layout vs. contrast) and adding a fifth
"Technical Quality" dimension, and rejected both: `docs/PRODUCT_SPEC.md`
already scopes `legibility` to cover exactly that ground ("text too small,
low contrast, key element cropped or obscured, cluttered composition"),
and a real Meta feed ad has no technical-quality concerns (resolution,
codec, etc.) beyond what legibility already captures. Four dimensions
already explain nearly every Launch/Test/Don't-Launch decision; a fifth
would add surface area without changing outcomes, which the guiding
principle in this document's preamble rules out.

**Reconciliation with `CAMPAIGN_TYPE_SIGNALS` / `OCCASION_SIGNALS`:** these
should not survive as a structurally separate system. Every entry in both
tables is already tagged `category: "message_clarity"` in
`lib/verdict/mock-engine.ts` today — this document promotes that implicit
choice to an explicit rule: **campaign-type and occasion expectations are
evidence checks inside `message_clarity`**, not a fifth category and not a
parallel finding-generation path. A future implementation milestone (not
this one — see Constraints) can retire the separate `CampaignSignal` type
and its two lookup tables in favor of `message_clarity` evidence-gathering
that reads `CreativeContext.campaignType`/`occasion` directly.

### The four dimensions

#### Policy risk (renders as "Policy compliance" on a strength)

- **Purpose:** predicts whether Meta ad review would reject or restrict
  the creative — the single most catastrophic outcome, since it can waste
  100% of the intended spend regardless of everything else about the ad.
- **Observable evidence:** on-image text density, before/after or
  comparison framing, prohibited-claims language (health/finance
  superlatives, guarantees), restricted imagery.
- **Common strengths:** clean text-to-image ratio, no prohibited claim
  language, straightforward, literal product depiction.
- **Common weaknesses:** dense overlay text, before/after framing,
  unverifiable superlative claims.
- **Deserves image annotations:** yes, when tied to a specific visible
  element (a dense text block, a specific claim overlay); no, when the
  risk is about the creative's overall framing rather than a region — the
  existing "Applies to the overall creative" UI state covers this.
- **Can become critical:** yes — the dimension most likely to justify
  Don't Launch on its own, since a policy violation can block the ad from
  running at all.

#### Legibility

- **Purpose:** predicts whether the message is actually received at real
  viewing conditions (a mobile feed thumbnail, a half-second glance),
  independent of whether the message itself is good.
- **Observable evidence:** text size relative to canvas, text/background
  contrast, CTA visual weight vs. background, cropping/occlusion of key
  elements, competing focal points.
- **Common strengths:** high contrast, appropriately sized type at
  thumbnail scale, one clear focal point.
- **Common weaknesses:** small body copy, low-contrast CTA, cluttered
  composition, cropped logo or product.
- **Deserves image annotations:** yes, almost always — legibility issues
  are inherently spatial.
- **Can become critical:** yes, conditionally — a genuinely illegible CTA
  or value proposition (not merely suboptimal) means the ad can't do its
  job, which meets the same bar as a policy violation.

#### Brand consistency

- **Purpose:** predicts whether the creative reinforces or dilutes the
  stated brand — matters for recognition and for reputational safety.
- **Observable evidence:** logo presence/size/placement, palette match to
  the stated brand description, tone-of-voice match, generic vs.
  distinctive treatment relative to the stated Industry.
- **Common strengths:** coherent palette/logo treatment, a distinctive
  (not competitor-swappable) visual identity.
- **Common weaknesses:** small or absent logo, generic stock-photo feel,
  tone mismatch with the stated brand voice.
- **Deserves image annotations:** yes when tied to a specific element
  (the logo, a color block); no when it's a holistic tone judgment.
- **Can become critical:** only in egregious cases (wrong/outdated logo,
  a competitor's brand colors). Ordinary brand mismatch is real but should
  almost never alone justify Don't Launch — see the override rule in
  Section 3.

#### Message clarity (includes campaign/occasion strategic fit)

- **Purpose:** predicts whether a viewer understands what's on offer and
  what to do next in the time they actually spend on a paid ad — and
  whether that offer matches what the declared Campaign Type, Occasion,
  and Objective lead a viewer to expect.
- **Observable evidence:** presence and prominence of a single value
  proposition, presence/clarity of a CTA, count of competing messages,
  plus the absorbed strategic-fit checks: a visible price/offer for a
  Promotion creative, absence of false urgency on an Evergreen creative,
  event-specific cues for a declared Occasion, "what's new" clarity for a
  Product Launch.
- **Common strengths:** one unambiguous CTA, value proposition in the
  first visual read, campaign-type expectations met (e.g. a visible offer
  on a Promotion creative).
- **Common weaknesses:** competing headlines/badges, no visible CTA,
  campaign-type mismatch (a Promotion creative with no visible offer, an
  Evergreen creative using countdown urgency).
- **Deserves image annotations:** yes for headline/CTA-specific findings;
  no for the absorbed campaign-fit checks, which are creative-wide
  judgments about the presence or absence of a concept rather than a
  region — matching how `CAMPAIGN_TYPE_SIGNALS`/`OCCASION_SIGNALS` never
  carry a `boundingBox` today.
- **Can become critical:** yes — a creative with no discoverable CTA or
  value proposition fails its one job regardless of production polish.

---

## 3. Decision Logic

The mock engine's core flaw (Section 1) is that it picks a verdict, then
manufactures matching evidence. This framework inverts that: **findings
determine the verdict, deterministically, via the rule below — never the
reverse, and never a numeric score.**

### Finding severity

Every weakness (not strength) carries a two-tier severity, replacing the
mock engine's randomly-assigned `blocking` flag with an evidence-based
one:

- **Notable** — a real issue, worth surfacing, not launch-blocking alone.
- **Critical** — in isolation, would make spending against this creative
  as-is a mistake.

**Override condition:** only `policy_risk`, `legibility`, and
`message_clarity` weaknesses may be marked critical. `brand_consistency`
weaknesses are always notable at most. This is an explicit rule, not a
per-run judgment call — a brand mismatch, however real, essentially never
makes an ad wasteful to run the way a policy rejection or a broken CTA
does, and encoding that as a fixed rule is what keeps the framework
deterministic rather than dependent on how strict a given evaluation
happened to feel.

### The decision tree

```
1. If ANY weakness is marked critical
      -> Don't Launch
   (only policy_risk / legibility / message_clarity findings are eligible
   to be critical; a single critical finding is launch-blocking on its
   own, regardless of how many strengths exist elsewhere)

2. Else, if ANY weakness in policy_risk, legibility, or message_clarity
   is marked notable
      -> Test

3. Else (no weaknesses in the three high-stakes dimensions; at most
   notable brand_consistency weaknesses)
      -> Launch
```

Three branches, no scoring, no weighting table — the simplest rule the
panel could justify that still reflects `docs/PRODUCT_SPEC.md`'s own
definitions of the three verdicts (Don't Launch = "a critical issue... the
`blocking`/critical rule directly encodes this; Test = "workable, but has
specific fixable issues" = exactly one or more notable high-stakes
weaknesses; Launch = "no material issues found").

### Conflicting signals

A dimension may legitimately contain both a strength and a weakness at
once (e.g. a strong CTA and a weak headline, both under `message_clarity`)
— this is not a conflict and both are kept. A genuine contradiction —
the same visual element characterized as both good and bad (e.g.
overlapping bounding boxes with opposite polarity) — is not something
Section 3's tree resolves by picking a winner. It's treated as a
validation failure at the AI Contract layer (Section 5) and should trigger
a retry, not a silent pass-through.

### Uncertainty handling

A dimension producing zero findings is neutral, not a Launch signal by
itself — the tree only branches on weaknesses that exist. Thin or
one-sided evidence is instead reflected in confidence (Section 5), which
is derived from coverage and agreement across all four dimensions, kept
strictly separate from the verdict computation above so the two "can't be
confused," per `docs/PRODUCT_SPEC.md`.

### Campaign context interaction

Campaign Type, Occasion, and Objective do not get their own branch in the
tree. Per Section 2's reconciliation, they modulate what counts as
evidence *within* `message_clarity` — a Promotion creative with no visible
price becomes a `message_clarity` weakness (critical if severe enough),
which then flows through the same three-branch tree as any other finding.
There is no separate campaign-context verdict, which is what makes it safe
to fold `CampaignSignal` into ordinary `message_clarity` evidence-gathering
rather than keeping it structurally distinct.

---

## 4. Report Philosophy

The report's *structure*
(`components/verdict-report.tsx`, `docs/UI_SPEC.md`) is not being
redesigned — the panel's critique targets what feeds it, per the
`docs/PRODUCT_SPEC.md`-defined goal of an evaluation framework, not a UI
refresh.

- **More concise:** no change needed at the page level — the existing
  sections (badge, summary, context pills, strengths, weaknesses,
  recommendations) are already tight. The repetition worth cutting is at
  the copy-generation layer (below), not the layout.
- **More opinionated:** already correct in direction; Section 3's
  single deterministic override (any critical finding wins) reinforces it
  by removing "vague scoring" as a hedge.
- **More educational:** explicitly **not** recommended. `docs/PRODUCT_SPEC.md`'s
  persona "is not a design expert... wants a clear answer, not a wall of
  caveats." Adding general "why this matters" explainers would work
  against both conciseness and that stated persona; the category tag
  already carries the necessary context. (`docs/ROADMAP.md`'s Phase 3 already
  lists this as a stretch goal, not core scope — consistent with this
  recommendation.)
- **More actionable:** the recommendations list is already the right
  layer; making findings evidence-backed (Section 5) makes
  recommendations easier to write specifically, without a new section.
- **Less repetitive:** two concrete repetitions to fix at the
  generation-logic level:
  1. Recommendations today are a 1:1 rephrasing of their source weakness
     ("CTA blends into background" → "give the CTA a contrasting color")
     — worth requiring recommendations to add a concrete step (e.g. a
     specific contrast or size target) rather than restating the problem
     with a verb in front of it.
  2. The executive summary and the `blocking` weakness's own row can say
     the same thing twice, because the summary currently narrates
     `weaknesses[0]` (array order) rather than the finding that actually
     drove the verdict. Section 5 requires the summary be anchored to
     whichever finding(s) produced the computed verdict in Section 3
     instead.
- **More evidence-driven:** this is the philosophy's central, load-bearing
  change, and it comes entirely from the schema (Section 5), not from a
  new report section — today's copy already *sounds* evidence-driven; the
  fix is making it actually be evidence-driven.

**No new report sections and no UI changes are recommended anywhere in
this document** — every improvement above is upstream, in the schema and
generation logic, consistent with the milestone's scope.

---

## 5. AI Contract

Reviewed against `lib/verdict/types.ts`'s current `VerdictReport`. Per the
milestone's consistency requirement, every recommendation below uses the
exact dimension names and decision concepts from Sections 2–3 — nothing
here introduces terminology Sections 2–3 didn't already define.

### Fields to keep (unchanged)

`verdict`, `strengths: AnnotatedPoint[]`, `weaknesses: Weakness[]`,
`recommendations: string[]`, `category: AnnotationCategory` (the same four
values, per Section 2), `boundingBox?` (the same `x`/`y`/`width`/`height`
percentage shape), `blocking: boolean` on `Weakness` — this boolean is
already the right shape for Section 3's two-tier severity (`blocking:
true` = critical, `false` = notable) and needs no structural change, only
the validation rule below constraining when `true` is legal.

### Fields to remove

None. The current shape is already minimal; nothing identified in
Sections 1–4 is dead weight.

### Fields to add

- **`evidence: string`** on every `AnnotatedPoint` (strengths and
  weaknesses both) — a short, literal description of what's visible in
  the image or stated in context that grounds the finding, distinct from
  `summary` (the marketer's-voice takeaway `summary` already is).
  This is the one addition the panel considers non-optional: it's the
  only structural defense against Section 1's evidence-free-verdict
  problem and Section 6's hallucination risk, which is why it clears the
  "only add complexity that changes an outcome" bar from this document's
  guiding principle. Two fields the panel considered and **rejected** for
  the same reason they don't clear that bar: a freeform
  `confidenceRationale` string (redundant once confidence is computed
  deterministically, below) and a per-box `boundingBoxConfidence` number
  (a box is either trusted, per the validation rules below, or it isn't —
  a separate confidence number wouldn't change any decision the framework
  makes).

### Validation rules (deterministic post-processing)

1. `category` must be one of the four `AnnotationCategory` values defined
   in Section 2 — reject/retry otherwise.
2. `blocking: true` is only valid when `category` is `policy_risk`,
   `legibility`, or `message_clarity` (Section 3's override rule) — a
   `brand_consistency` weakness with `blocking: true` is coerced to
   `false` server-side, not trusted from the model.
3. **`verdict` is recomputed server-side from the validated findings using
   Section 3's decision tree — the model's own stated verdict, if any, is
   informational only and never authoritative.** This is the strongest
   recommendation in this section, and the direct fix for Section 1's
   core finding: trust the model's findings, not its verdict.
4. **`confidence` is computed the same way** — deterministically, from
   evidence coverage (did all four dimensions produce at least one
   finding?) and agreement (no unresolved contradictions, per Section 3)
   — never accepted verbatim from the model.
5. Every finding must carry a non-empty `evidence` string; reject/retry
   findings that omit it.
6. `boundingBox`, when present, must have all four values within [0, 100]
   with `width`/`height` > 0 — an existing implicit assumption, now an
   explicit, checkable rule.
7. `recommendations.length` should be greater than 0 whenever
   `weaknesses.length` > 0, but is **not** required to be a strict 1:1
   mapping — deliberately looser than today's mock engine, so recommendation
   generation isn't forced into the restate-the-weakness pattern flagged
   in Section 4.

### Evidence requirements

Every strength and weakness requires the `evidence` field above.
`message_clarity` findings that originate from the absorbed campaign-fit
checks (Section 2) must ground their evidence in the specific declared
`CreativeContext` field being checked (e.g. "Campaign Type: Promotion, no
price or offer visible") rather than a generic template sentence — this is
what makes Section 2's reconciliation hold at generation time, not just in
this document.

### Deterministic post-processing (recap)

`verdict` computed from findings, not model-asserted · `confidence`
computed from coverage/agreement, not model-asserted · `blocking`
constrained by `category` · executive summary anchored to the finding(s)
that produced the computed verdict (Section 4), not to array position.

---

## 6. Risks Before Connecting a Real LLM

- **Hallucinations.** The model may describe something that isn't on the
  image (e.g. a CTA that doesn't exist). The `evidence` field (Section 5)
  and the eventual calibration pass (`docs/ROADMAP.md` Phase 2) are the only
  real mitigations — nothing in this framework can verify ground truth by
  itself, only require the model to commit to a specific claim that a
  human calibration pass can later check.
- **False confidence.** A model could state high confidence backed by
  thin or single-sided evidence. Structurally mitigated by computing
  confidence from coverage instead of letting the model assert it
  (Section 5) — but this only helps once the underlying findings
  themselves are trustworthy; confidence computed from hallucinated
  findings would still look "earned." Not a solved problem, a bounded
  one.
- **Contradictory findings.** The same element characterized as both a
  strength and a weakness. Section 3 deliberately does not resolve this
  by picking a winner — it's a validation failure (Section 5) that should
  trigger a retry.
- **Annotation ambiguity.** Unlike the mock engine's blind random boxes, a
  real model's coordinates may be directionally right but imprecise, or
  point at the wrong one of several similar elements (e.g. two CTAs).
  `docs/ROADMAP.md` Phase 2 already calls for a calibration pass against real
  creatives — this framework doesn't reduce that need, it prepares for it
  (percentage-based boxes, "approximate is fine" per `docs/PRODUCT_SPEC.md`).
- **Inconsistent severity.** Section 5's rule 2 removes the model's
  discretion on one axis (a `brand_consistency` issue can never be
  critical), but within the three dimensions that *can* be critical,
  whether a specific issue crosses that bar is still a model judgment call
  — nothing here guarantees that judgment is stable across near-identical
  creatives evaluated twice. This is exactly what the calibration pass
  needs to measure, not something a schema rule can guarantee.
- **Campaign-context dependence.** `message_clarity` evidence now depends
  on the model correctly interpreting free-text fields (Industry, Target
  audience) as well as fixed enums (Campaign Type, Occasion, Objective). A
  vague or poorly-filled free-text field could degrade evidence quality in
  ways the decision tree can't detect, since Section 3 only sees findings,
  not raw form input. Fixing the form itself is out of scope here (UI is
  assumed correct) — flagged as an open question below.
- **Evidence fabrication.** A subtler version of hallucination worth
  naming separately: a model could satisfy validation rule 5 ("non-empty
  evidence string") with plausible-sounding but still-fabricated text. A
  schema can enforce that evidence is *present*, never that it's *true*.
  This is the fundamental limit of deterministic post-processing, and the
  reason the calibration pass in `docs/ROADMAP.md` Phase 2 should be treated
  as a launch gate for real-model evaluation, not an optional nice-to-have.

---

## Recommended Methodology

Evaluate every creative against the same four dimensions Verdict already
defines (`policy_risk`, `legibility`, `brand_consistency`,
`message_clarity`), with campaign-type/occasion strategic fit folded into
`message_clarity` rather than kept as a parallel mechanism. Every finding
must carry a literal `evidence` string in addition to its marketer-voice
`summary`. Weaknesses carry a two-tier severity (notable / critical),
where only `policy_risk`, `legibility`, and `message_clarity` findings are
eligible to be critical. The verdict is never asserted by the model — it's
computed server-side by a three-branch decision tree (any critical finding
→ Don't Launch; any notable high-stakes finding → Test; otherwise →
Launch), and confidence is likewise computed from evidence coverage and
agreement rather than guessed. The report's structure and the UI do not
change; only the data feeding them becomes evidence-grounded and
deterministic instead of decorative.

## Open Questions

- **Single-shot vs. multi-pass generation.** This framework assumes one
  structured model call produces all findings across all four dimensions,
  per the guiding simplicity principle. `docs/UI_SPEC.md`'s rotating status
  lines ("Checking policy risk…", "Weighing brand fit…") already *imply* a
  multi-step process today, but that's cosmetic in the mock phase — this
  document doesn't require it to become a real multi-pass pipeline in
  Phase 2, but a future implementation milestone should decide explicitly
  rather than by default.
- **Per-dimension finding bounds.** This document doesn't set a minimum or
  maximum number of findings per dimension — worth bounding (e.g. 0–3) in
  the actual prompt design to keep report length consistent with
  `docs/PRODUCT_SPEC.md`'s expectations, but that's a prompt-engineering
  decision for the implementation milestone, not a methodology question.
- **Calibrating "critical."** Section 3 defines the rule structurally
  (which dimensions are eligible), but not the real-world severity bar a
  model should apply within those dimensions — that requires the
  calibration pass against real sample creatives that `docs/ROADMAP.md`
  Phase 2 already calls for.
- **Structuring the free-text context fields.** Whether Industry and
  Target audience need more structure to reduce the campaign-context-
  dependence risk (Section 6) is explicitly left open — addressing it
  would touch the Analyze form, which is out of scope for a task that
  assumes the existing UI is correct.
- **Retiring `CampaignSignal`.** This document recommends the direction
  (fold into `message_clarity` evidence-gathering) but doesn't implement
  it — sequencing that refactor relative to the real prompt work is an
  implementation-milestone decision.

## Risks

The full risk analysis is in Section 6 above. In order of how directly
this framework can mitigate them: contradictory findings and inconsistent
`blocking` eligibility are addressed structurally (validation rules,
Section 5); false confidence and annotation ambiguity are partially
addressed (computed rather than asserted, but still dependent on
underlying finding quality); hallucination and evidence fabrication are
not solved by any schema rule and depend on the calibration pass
`docs/ROADMAP.md` Phase 2 already scopes; campaign-context dependence is
a form-design risk this document explicitly declines to fix, being out of
scope.

## Suggested Implementation Sequence

1. Add the `evidence` field to `lib/verdict/types.ts`'s `AnnotatedPoint` —
   the one additive schema change this document identifies.
2. Fold `CAMPAIGN_TYPE_SIGNALS`/`OCCASION_SIGNALS` into ordinary
   `message_clarity` evidence-gathering, retiring the separate
   `CampaignSignal` mechanism, before writing the real model prompt — so
   the prompt isn't built around a structure this document already
   recommends removing.
3. Implement the deterministic post-processing layer (verdict computed
   from findings, confidence computed from coverage) as pure functions
   independent of which engine produced the findings — buildable and
   unit-testable against the *existing* mock engine's output first,
   decoupling "is the decision logic correct" from "does the real model
   work," matching `docs/DEVELOPMENT_PLAN.md`'s pattern of small,
   checkable increments.
4. Only after 1–3 are solid, write the actual `openai-engine.ts` prompt
   and structured-output schema per `docs/ROADMAP.md` Phase 2, using this
   document as the spec for what the model must produce.
5. Run the calibration pass `docs/ROADMAP.md` Phase 2 already calls for,
   specifically targeting the "critical" severity threshold and the
   evidence-fabrication risk from Section 6 before treating Phase 2 as
   done.
