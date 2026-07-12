# Verdict — UI Spec

## Design philosophy

Swiss minimalism, not Apple-inspired: a predominantly monochrome canvas —
generous whitespace, calm typography, and motion that clarifies state
changes rather than performing — with one fluorescent brand accent used
sparingly and deliberately to create emphasis, never decoration. The
product covers four screens. If a design idea doesn't make the verdict
clearer or the flow faster, cut it.

Concretely:
- One neutral base (near-white / near-black background depending on system
  theme), one text-ink color, one brand accent — Electric Lime — reserved
  for primary actions and interactive emphasis. See "Brand identity" below.
- Verdict color-coding is the only other place color carries meaning: green
  = Launch, amber = Test, red = Don't Launch. This system is deliberately
  independent from the brand accent (see "Brand identity" for how the two
  are kept from colliding) and is used consistently for the verdict badge
  and nothing else — it does not bleed into unrelated UI chrome.
- Large, deliberate type for the verdict headline; everything else is quiet
  and secondary.
- System font stack (`-apple-system`/San Francisco fallback chain), no
  decorative fonts.
- Light and dark mode both supported from day one via `prefers-color-scheme`
  — trivial to do with Tailwind, not worth skipping. The monochrome base
  swaps between schemes; Electric Lime does not (see below).

## Brand identity

**Electric Lime** (`#C6FF00`) is Verdict's only brand accent. It exists to
make specific interactive moments feel intentional, not to decorate the
interface. The interface otherwise stays monochrome — white, black, and
grayscale — so that when lime appears, it reads as a deliberate signal.

Use it for:
- Primary CTA buttons
- Interactive focus states
- Active navigation states
- Progress indicators and loading animations
- Small UI highlights on interactive elements that require emphasis

Don't use it for:
- Large fills or background areas — it's an accent, not a surface color
- Body text, or any text set directly on a light background — at this
  luminance it fails contrast as text. Use it as a fill or stroke instead,
  with black or near-black label text on top (e.g. a lime CTA button gets a
  black label, not a white one)
- Decorative flourishes with no interactive meaning
- Anything in the Verdict status system below — the two color systems must
  stay visually distinct from each other

**Color scheme behavior:** Electric Lime stays constant across light and
dark mode — only the monochrome base (background / text-ink) swaps via
`prefers-color-scheme`. A single fixed fluorescent value reads correctly
against both a near-white and a near-black surface without needing a
variant.

**Staying distinct from Verdict status colors:** "Launch" green must read
as clearly different from Electric Lime — a saturated, blue-leaning green,
not a yellow-leaning one — so that a lime CTA sitting near a green Launch
badge never looks like the same color family. This is what keeps the
brand-accent system and the status system independent in practice, not
just in principle.

**Verdict status color values:** two variants of each color exist, used
in different contexts:

| Verdict | Text/badge — light mode | Text/badge — dark mode | Marker (fixed, both modes) |
|---|---|---|---|
| Launch | `#047857` | `#34D399` | `#10B981` |
| Test | `#B45309` | `#FBBF24` | `#F59E0B` |
| Don't Launch | `#B91C1C` | `#F87171` | `#EF4444` |

The text/badge pair swaps with `prefers-color-scheme`, the same way
`--background`/`--foreground` do (both pairs verified at ≥4.5:1 contrast
against their respective surface) — these colors sit on the app's own
monochrome chrome (verdict headline, badge, category tags) and need to
hold contrast against a near-white or near-black surface, so a single
fixed value can't serve both. Markers are different: they sit on top of
the uploaded creative — an arbitrary photographic background, not app
chrome — so a marker keeps one fixed, more saturated value in both
themes (paired with the drop shadow specified in "Visual annotation
design" below for on-image legibility), the same reasoning that keeps
Electric Lime itself fixed.

"Test" amber sits in the same rough hue family as Electric Lime but stays
distinct in practice: it's deeper and more orange, reserved strictly for
a status badge, and never appears on an interactive control — so the two
never compete for the same read in the same moment.

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
  zone above it), in this order: Brand, Website, Industry, Campaign
  objective, Campaign Type, Occasion (conditional, see below), Target
  audience (optional). Laid out as compact labeled rows, not a dense grid.
  Selects use custom dropdowns consistent with the rest of the UI, not raw
  `<select>` chrome.
  - Campaign objective and Campaign Type sit directly adjacent — see
    `PRODUCT_SPEC.md`'s "Campaign objective vs. Campaign Type" for why
    they're separate fields. Adjacency here is what makes the distinction
    read as intentional rather than a duplicate question.
  - Occasion appears immediately below Campaign Type, and only when
    Campaign Type is Holiday, Seasonal, Promotion, Sale, or Other — no
    transition/animation on show or hide, consistent with how the context
    form itself appears once an image is selected (progressive disclosure
    without extra motion). It defaults to "None" and never blocks
    submission, even while visible. Styled identically to the other
    custom dropdowns — no icons, no decorative holiday styling; it should
    read as a normal form field, not a themed picker.
- **Primary action**: single button, "Analyze," full width on mobile,
  disabled with a subtle inline hint until required fields + image are
  present. No modal confirmations.

**Analyzing state** (replaces the form in place, full-screen within this
route, after "Analyze" is pressed):

- The form cross-fades out; the uploaded creative's thumbnail (scaled up,
  centered) becomes the focal point, with a premium animated loading
  treatment — not a generic spinner. A soft pulsing glow and a slow scan
  sweep around the image edge, in Electric Lime per "Brand identity" above,
  reads as "considered" rather than "waiting."
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
  three-way scheme (see "Verdict status color values" in "Brand identity"
  above), with the **confidence score** shown as a small secondary element
  beside or beneath it (e.g. "72% confidence") — visually subordinate to
  the verdict itself, never competing with it for attention. This is the
  product's one intentional "reveal" moment: on first render, the badge
  and its label fade/scale in together — a brief, subtle entrance (under
  ~400ms, matching the fade-slide treatment already used elsewhere in the
  product), not a flashy animation — so the verdict reads as the payoff of
  the analysis that just ran, rather than appearing as static text.
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

- **Data model**: each strength/weakness carries an optional
  `boundingBox` (`x`, `y`, `width`, `height`, all percentages of image
  width/height — see `ARCHITECTURE.md`'s `AnnotatedPoint`). The marker
  renders as a point at the box's center; the hover/focus outline (below)
  renders the box itself. One data shape drives both the point and the
  extent, so there's nothing to keep in sync between them.
- **Scope**: only strengths and weaknesses get hotspots. Recommendations
  are never annotated on the image — a recommendation is an action, not a
  location (`PRODUCT_SPEC.md`) — so there is no third marker type or
  color. If a strength/weakness has no `boundingBox`, it still appears in
  its list normally, just without a marker or on-image click target.
- Marker: a small filled circle (~24px), colored by kind (strength vs.
  weakness, not a three-tier severity scale) using the fixed marker
  values from "Verdict status color values" above (`#10B981` strength /
  `#EF4444` weakness — fixed in both themes, unlike the badge/text pair,
  because markers sit on top of the uploaded creative's own colors, not
  the app's chrome), positioned at the center of the hotspot, with a
  subtle drop shadow so it reads on any background.
- On hover/focus (desktop): marker scales up slightly and a thin outline
  rectangle fades in around the bounding box, so users see both the point
  of interest and its rough extent.
- **Touch (mobile)**: there's no hover, so tap does the work hover+click
  do together on desktop, in one step, and scrolling always follows the
  side just tapped so the two scroll targets never fight each other:
  tapping a marker selects it (shows the outline, highlights the matching
  list row, scrolls the row into view); tapping a strength/weakness row
  selects it (highlights the marker, scrolls the annotated creative into
  view) — this is what keeps the image reachable when the row a user taps
  is further down the page than the image. Tapping the same marker or row
  again deselects it; tapping a different marker or row moves the
  selection. There's no separate "preview on hover" state to design for on
  touch — selection is just binary and explicit.
- Markers never obscure the specific detail they're pointing at — offset
  the marker slightly outside the hotspot's corner when the area is small.
- **Marker collision avoidance**: when two markers' centers land close
  enough to overlap or make tapping the right one difficult, the marker
  dot (not the bounding box) is nudged apart by a small, deterministic
  amount, clamped so it never leaves the image. The bounding box outline
  always stays at its original coordinates — only the point marking it
  moves. If a marker is nudged far enough that its link to the box isn't
  obvious, a subtle dashed connector line ties the two together.
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
