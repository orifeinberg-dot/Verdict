# 008 - Design Verdict Report

## Objective

Design the Verdict report experience before implementation.

This is a **documentation-only** task.

Do not modify production code.

---

## Background

The Verdict page is the core product experience.

The current app has:
- Landing page
- Analyze page
- Image validation
- Loading experience
- Electric Lime brand identity

The real Verdict report page has not been implemented yet.

The final route should be:

`/verdict/[id]`

The MVP uses `sessionStorage` for report data, not a database.

---

## Requirements

Design the structure and UX of the Verdict report page.

The page should include:

- Verdict outcome:
  - Launch
  - Test
  - Don’t Launch
- Confidence score
- Executive summary
- Key strengths
- Key weaknesses
- Actionable recommendations
- Uploaded creative preview
- Visual annotations / hotspots on the creative
- Clear distinction between:
  - Brand accent color: Electric Lime
  - Semantic verdict colors: green / amber / red

---

## UX Direction

The report should feel like receiving a professional creative review from a senior growth marketer.

It should be:

- Premium
- Minimal
- Opinionated
- Clear
- Practical
- Calm
- Easy to scan

The Verdict itself should be the emotional “wow” moment.

Avoid generic AI-assistant language.

Avoid clutter.

Avoid long paragraphs.

---

## Visual Annotation Direction

Visual annotations should be approximate hotspots, not pixel-perfect bounding boxes.

Each hotspot should include:

- Type:
  - strength
  - weakness
  - recommendation
- Short label
- Explanation
- Approximate x/y position on the creative

The UI should make clear that these are visual guidance points, not exact technical measurements.

---

## Output Structure

Update or create documentation that defines:

- Report page layout
- Report data structure
- Component hierarchy
- Visual annotation model
- Empty/error state behavior
- Mobile behavior
- Future extensibility for saved reports and sharing

Relevant docs may include:

- `docs/PRODUCT_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DEVELOPMENT_PLAN.md`

Only update documents where appropriate.

---

## Acceptance Criteria

The task is complete when:

- `/verdict/[id]` report UX is clearly specified.
- Report sections are defined.
- Visual annotation behavior is documented.
- Data requirements are documented.
- Mobile behavior is considered.
- No production code is changed.
- The documentation is ready for a follow-up implementation prompt.

---

## Deliverables

Before making changes:

1. Summarize your understanding of the task.
2. List which documents you intend to modify and why.
3. Flag any product or architecture concerns.
4. Wait for my approval.

After updating the docs:

1. Summarize what changed.
2. Explain any open decisions.
3. Recommend the next implementation prompt.