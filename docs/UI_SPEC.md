# Verdict — UI Spec

## Design philosophy

Apple-inspired means restraint, not decoration: generous whitespace, a single
accent color used sparingly, calm typography, and motion that clarifies state
changes rather than performing. The product covers four screens. If a design
idea doesn't make the verdict clearer or the flow faster, cut it.

Concretely:
- One neutral base (near-white / near-black background depending on system
  theme), one text-ink color, one accent color reserved for primary actions.
- Verdict color-coding is the only place color carries meaning beyond the
  strength/weakness distinction below: green = Launch, amber = Test,
  red = Don't Launch. Used consistently for the verdict badge and nothing
  else — it does not bleed into unrelated UI chrome.
- Large, deliberate type for the verdict headline; everything else is quiet
  and secondary.
- System font stack (`-apple-system`/San Francisco fallback chain), no
  decorative fonts.
- Light and dark mode both supported from day one via `prefers-color-scheme`
  — trivial to do with Tailwind, not worth skipping.

## Screens

Four screens, three routes (the loading state is not a route — see
`ARCHITECTURE.md` for why). Real navigation between `/`, `/analyze`, and
`/verdict/[id]`, not a single page swapping its own contents.

### 1. Landing (`/`)

Purpose: first impression and nothing else. No header nav, no footer links,
no secondary CTAs competing with the primary one.

- **Hero**: a short, direct headline stating the value proposition (e.g.
  "Know if your ad is ready — before you spend on it"), one supporting
  sentence beneath it, generous vertical centering rather than a dense
  above-the-fold layout.
- **Primary CTA**: a single button, "Analyze a Creative," visually the
  most prominent element on the page. Navigates to `/analyze`.
- Optional, minimal supporting visual (e.g. a static, non-interactive
  preview of what an annotated verdict looks like) to make the value
  proposition concrete — only if it can be done without adding real
  interaction or content to maintain. Cut it if it starts to need its own
  states.

This page has no loading states, no error states, and no logic — it's the
one screen in the product that's pure presentation.

### 2. Analyze (`/analyze`)

Purpose: collect everything required for the analysis. This screen has two
states: the **form** (default) and **analyzing** (after submit), described
separately below, but both live on this one route.

**Form state:**

Single centered column, max-width ~640px.

- **Upload zone**: large dashed-border drop target with click-to-browse
  fallback. Accepts a single static image (JPG/JPEG, PNG, WEBP) up to 10MB
  — see `PRODUCT_SPEC.md` for the full validation rules. Shows a live
  thumbnail preview once selected, with a small "replace" affordance — no
  separate confirmation step. If the image triggers a soft warning
  (unusual aspect ratio, low resolution), show a small inline warning
  beneath the thumbnail rather than blocking — the form and "Analyze"
  button remain usable.
- **Context form**: appears once an image is present (progressive
  disclosure — don't show the form before there's something to review).
  Fields per `PRODUCT_SPEC.md` (creative is already handled by the upload
  zone above it): Brand, Website, Industry, Campaign objective, Target
  audience (optional). Laid out as compact labeled rows, not a dense grid.
  Selects use custom dropdowns consistent with the rest of the UI, not raw
  `<select>` chrome.
- **Primary action**: single button, "Analyze," full width on mobile,
  disabled with a subtle inline hint until required fields + image are
  present. No modal confirmations.

**Analyzing state** (replaces the form in place, full-screen within this
route, after "Analyze" is pressed):

- The form cross-fades out; the uploaded creative's thumbnail (scaled up,
  centered) becomes the focal point, with a premium animated loading
  treatment — not a generic spinner. A soft pulsing glow or slow gradient
  sweep around the image edge reads as "considered" rather than "waiting."
- Rotates through short, specific status lines that build anticipation and
  communicate real evaluation stages (e.g. "Reading the creative…",
  "Checking policy risk…", "Weighing brand fit…", "Finalizing verdict…").
  These are cosmetic in the mock-engine phase and can become genuinely
  sequenced once real model calls exist in multiple steps — but even in the
  mock phase they should hold for a perceptible minimum duration
  (~1.5–2.5s total) so the product doesn't feel like it skipped a step.
- On completion, the app generates a report id, saves the result (see
  `ARCHITECTURE.md`), and navigates to `/verdict/[id]` — the user never
  manually dismisses this state.
- No cancel button needed for MVP scope (the call is fast/local); revisit
  if real model latency grows enough to matter.

### 3. Verdict (`/verdict/[id]`)

The centerpiece of the product, and its own page. Two-column layout on
desktop (image left, report right), stacked on mobile (image first, then
verdict, then the rest).

- **Verdict badge**: top of the report column, large, colored per the
  three-way scheme, with the **confidence score** shown as a small
  secondary element beside or beneath it (e.g. "72% confidence") — visually
  subordinate to the verdict itself, never competing with it for attention.
- **Executive summary**: a few sentences directly beneath the badge, in
  normal-weight text. This is the first thing a user's eye should land on
  after the image and the badge.
- **Annotated creative**: the uploaded image rendered at natural aspect
  ratio, with circular markers overlaid at each strength's and weakness's
  hotspot. Markers are two-toned by kind, not by severity tier: a positive
  color (matches "Launch" green) for strengths, a warning color (matches
  "Don't Launch" red) for weaknesses. Markers are clickable/hoverable.
  Approximate hotspot placement is acceptable per `PRODUCT_SPEC.md`.
- **Strengths / Weaknesses**: two clearly separated lists beneath the
  summary, each row showing its marker (if it has a hotspot), category tag,
  and short explanation. Hovering or clicking a row highlights the
  corresponding marker on the image (synchronized selection state); clicking
  a marker scrolls to and highlights the matching row. This bidirectional
  link is the one piece of real interaction complexity in the product and
  worth getting right.
- **Recommendations**: a short, plain list beneath strengths/weaknesses —
  not annotated on the image, since a recommendation is an action, not a
  location.
- **Actions**: "Analyze another creative" (navigates back to `/analyze`,
  starting fresh) and "Copy summary" (copies a plain-text version of the
  verdict, confidence, executive summary, and recommendations — useful,
  cheap to build, no backend needed).
- **Report not available**: if this route is opened without the data it
  needs in this browser session (direct navigation, a shared link, or a
  new session after the original one ended), show a plain, non-alarming
  state explaining that this report isn't available in the current session,
  with a CTA back to `/analyze`. This is the honest surface of the MVP's
  storage model (see `ARCHITECTURE.md`) — treat it as a normal empty state,
  not an error page.

## Visual annotation design

This is the product's signature visual element, so it gets specific
treatment:

- Marker: a small filled circle (~24px), colored by kind (strength vs.
  weakness, not a three-tier severity scale), positioned at the center of
  the hotspot, with a subtle drop shadow so it reads on any background.
- On hover/focus: marker scales up slightly and a thin outline rectangle
  fades in around the approximate hotspot area, so users see both the point
  of interest and its rough extent.
- Markers never obscure the specific detail they're pointing at — offset
  the marker slightly outside the hotspot's corner when the area is small.
- All marker/hotspot coordinates are expressed as percentages of image
  width/height (not pixels), so the same data renders correctly at any
  display size, including responsive resizing.

## States to design for explicitly

- **Landing**: pure presentation, no states.
- **Analyze — empty**: no image yet, form not shown.
- **Analyze — invalid file**: unsupported file type, file over 10MB, or an
  unreadable/corrupted image — inline error text under the upload zone, no
  modal/alert. Submission is blocked until a valid file is provided.
- **Analyze — soft image warning**: valid file but unusual aspect ratio,
  low resolution, or too small for reliable review — inline warning text
  under the upload zone, visually distinct from the hard error above (e.g.
  amber vs. red), but the form and "Analyze" button remain usable. Per
  `PRODUCT_SPEC.md`, the MVP should not over-block on these.
- **Analyze — analyzing**: described above.
- **Analyze — engine error** (mock engine throws, or later, the OpenAI call
  fails): stay on `/analyze`, replace the analyzing state with a plain
  inline message and a retry button — never navigate to `/verdict/[id]`
  without a real report.
- **Verdict — result**: described above.
- **Verdict — report not available**: described above.

## Responsiveness

Mobile is a first-class target, not an afterthought — static ad creatives
are usually reviewed on the go. The two-column verdict layout collapses to
a single column at the same breakpoint Tailwind's `md:` uses by default,
image first, full-bleed within the content margin, report content below.

## What's deliberately not designed

- No settings, preferences, or account menu — there's nothing to configure.
- No history/gallery of past uploads — no persistence exists beyond a
  single browser session (see `ARCHITECTURE.md`), so there's nothing to
  show across sessions.
- No onboarding/tutorial modal — the landing page's copy and the upload
  zone's affordance should be self-explanatory.
- No shared navigation chrome (header/footer) linking the three routes to
  each other outside the flow's own CTAs — there is exactly one path
  through this product, and it doesn't need a nav bar to express it.
