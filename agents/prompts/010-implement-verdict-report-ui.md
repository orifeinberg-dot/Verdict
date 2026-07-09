# 010 - Implement Verdict Report UI

## Objective

Replace the plain development report at `/verdict/[id]` with the polished Verdict report UI.

This milestone is focused on presentation and interaction only.

Do not add OpenAI integration, database, authentication, payments, saved history, sharing, or export.

---

## Background

Prompt 009 implemented the real Verdict infrastructure:

- Mock Verdict engine
- ReportStore using sessionStorage
- Server Action
- `/analyze` → `/verdict/[id]` pipeline
- Dynamic Verdict route

The current Verdict page displays a plain readable report dump.

Now we need to turn that into the core product experience.

---

## References

Read before implementation:

- `docs/PRODUCT_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_PLAN.md`
- `agents/prompts/008-design-verdict-report.md`
- `agents/prompts/009-implement-verdict-infrastructure.md`

Use the docs as the source of truth.

---

## Requirements

### Report page

Implement a polished `/verdict/[id]` report page containing:

- Verdict outcome:
  - Launch
  - Test
  - Don’t Launch
- Confidence score
- Executive summary
- Uploaded creative preview
- Strengths
- Weaknesses
- Recommendations
- Clear fallback state for missing/expired reports

---

### Visual annotations

Implement visual hotspots on the uploaded creative.

Hotspots should support:

- Strength annotations
- Weakness annotations

Do not implement recommendation hotspots.

Use the documented annotation model:

- Marker position = center of the bounding box
- Hover/click reveals the associated outline box
- Strengths and weaknesses sync with their matching list rows
- On mobile, tap should select the hotspot
- Tapping another hotspot changes selection
- Tapping the selected hotspot again can deselect it

Keep annotations subtle and premium.

Avoid making the creative look cluttered.

---

### Component structure

Create or update components as needed, such as:

- `VerdictReport`
- `AnnotatedImage`
- `VerdictBadge`
- `ConfidenceScore`
- `StrengthsList`
- `WeaknessesList`
- `RecommendationsList`

Keep components clean and reusable.

---

### Design direction

Follow the documented Verdict brand identity:

- Swiss minimalism
- Monochrome foundation
- Electric Lime used sparingly
- Semantic status colors for verdict outcomes
- Premium spacing and typography
- Calm reveal animation
- Clear, senior-growth-marketer tone

Do not bring back Apple blue.

---

## Constraints

Do not modify the mock engine unless a tiny shape mismatch requires it.

Do not change the report data model unless necessary.

Do not add OpenAI integration.

Do not add a database.

Do not add auth.

Do not add new product features beyond the report UI.

Do not implement sharing/export yet.

---

## Acceptance Criteria

The task is complete when:

- `/verdict/[id]` no longer looks like a dev dump.
- Report page feels like the main product experience.
- Verdict badge is prominent and polished.
- Confidence score is visible and clear.
- Strengths, weaknesses, and recommendations are easy to scan.
- Uploaded creative is shown with annotation hotspots.
- Hotspots sync with strengths/weaknesses.
- Mobile interaction works by tap.
- Missing report fallback still works.
- Refreshing `/verdict/[id]` still loads from sessionStorage.
- App runs with `npm run dev`.
- No console errors.
- Lint/build pass if available.

---

## Deliverables

Before making changes:

1. Summarize your understanding of the task.
2. List files you intend to create or modify.
3. Flag any risks, inconsistencies, or simplifications.
4. Wait for approval.

After implementation:

1. Summarize files changed.
2. Explain how to test the full UI.
3. Note known limitations.
4. Suggest a Git commit message.