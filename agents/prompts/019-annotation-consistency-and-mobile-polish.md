# 019 - Annotation Consistency & Mobile Polish

## Objective

Improve the reliability, clarity, and visual consistency of Verdict's annotation system.

This milestone focuses exclusively on the relationship between annotations, findings, and the creative image.

Do not modify the Verdict engine, report methodology, verdict semantics, OpenAI integration, or report language.

---

## Background

Following internal QA, several inconsistencies were identified in the annotation experience.

The goal of this milestone is to ensure users always trust the relationship between:

* the reported finding,
* the highlighted area,
* and the annotation marker.

This milestone intentionally focuses on presentation, interaction polish, and consistency.

---

## References

Read before implementation:

* `docs/PRODUCT_SPEC.md`
* `docs/UI_SPEC.md`
* `docs/ARCHITECTURE.md`
* `docs/DEVELOPMENT_PLAN.md`
* `agents/prompts/018-verdict-report-trust-and-clarity.md`

Also review the latest internal QA notes before implementation.

Use the current implementation as the source of truth.

Report any inconsistencies before editing.

---

# Requirements

## 1. Annotation consistency

Every weakness that refers to a visible visual element should have a corresponding annotation marker.

If a weakness intentionally does not receive a marker because it represents a strategic issue rather than a visual issue, make that distinction explicit rather than allowing the UI to appear inconsistent.

Do not introduce recommendation markers.

Do not change the underlying report model unless absolutely necessary.

---

## 2. Mobile marker → finding navigation

Improve the mobile scrolling behavior when a marker is selected.

The linked finding should arrive in a comfortable reading position rather than appearing at the bottom edge of the viewport.

Desktop behavior should remain unchanged.

---

## 3. Stronger active selection

The currently selected finding should become more visually obvious.

Maintain the existing design language.

Possible improvements include:

* stronger border
* improved background emphasis
* improved contrast
* slightly clearer elevation

Do not introduce animations or bright decorative colors.

The goal is immediate visual recognition.

---

## 4. Connector spacing

Review the connector between displaced markers and their bounding boxes.

Ensure the connector never appears cramped against the marker.

Maintain a clean, premium appearance.

---

## 5. Bounding-box consistency

Review the rendered annotation boxes.

They should feel intentional and visually consistent.

If the current rendering causes boxes to appear randomly square or rectangular without communicating meaning, improve the presentation while preserving accurate annotation.

Do not distort the actual annotated area simply for cosmetic reasons.

---

# Design Direction

Continue following Verdict's existing visual language:

* Swiss minimalism
* Calm hierarchy
* Premium spacing
* Electric Lime reserved for interaction
* Semantic annotation colors
* No decorative effects

The annotation system should feel dependable rather than attention-seeking.

---

# Constraints

Do not:

* change Verdict logic
* redesign the report
* modify verdict scoring
* change recommendation behavior
* add recommendation markers
* add OpenAI
* redesign mobile layouts
* introduce new interaction models

Keep this milestone focused on annotation quality.

---

# Acceptance Criteria

The task is complete when:

* Annotation behavior feels consistent.
* Missing visual markers are either resolved or intentionally explained.
* Marker → finding navigation lands comfortably on mobile.
* Active findings are immediately recognizable.
* Connectors appear clean.
* Bounding boxes feel visually intentional.
* Existing desktop behavior remains unchanged.
* Existing accessibility remains intact.
* Existing collision handling remains intact.
* Lint and build pass.
* No console errors occur.

---

# Testing Requirements

Test at minimum:

1. Multiple creatives with several weaknesses.
2. Creatives where weaknesses are close together.
3. Mobile viewport (~375px).
4. Tablet viewport.
5. Desktop viewport.
6. Marker selection.
7. Finding selection.
8. Refresh existing reports.
9. Missing report state.
10. Keyboard navigation.

---

# Deliverables

Before making changes:

1. Summarize your understanding.
2. List every file you intend to modify and explain why.
3. Explain how you intend to distinguish visual weaknesses from strategic weaknesses.
4. Explain your proposed improvements for mobile scrolling and active highlighting.
5. Identify any risks, documentation conflicts, or implementation simplifications.
6. Wait for my approval before editing any files.

After implementation:

1. Summarize files changed.
2. Explain each annotation improvement.
3. Explain how strategic weaknesses are handled.
4. Provide detailed manual testing steps.
5. Note known limitations.
6. Suggest a Git commit message.
