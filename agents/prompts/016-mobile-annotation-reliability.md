# 016 - Improve Mobile Annotation Reliability

## Objective

Make the Verdict report’s annotation system reliable, usable, and accessible on mobile devices.

This milestone focuses on the core interaction between the uploaded creative and its linked strengths and weaknesses.

Do not add OpenAI integration, database persistence, authentication, sharing, export, or new report features.

---

## Background

The UX audit identified three critical issues in the current annotation experience:

1. On mobile, the image is no longer visible when the user taps a strength or weakness lower in the report.
2. Annotation markers are visually small and can be difficult to tap accurately.
3. Multiple markers can overlap or cluster together.
4. Marker accessibility labels do not identify the associated finding.

The desktop annotation experience already uses:

* Hover for temporary preview.
* Click for persistent selection.
* Synced interaction between markers and findings.

This behavior should remain intact.

---

## References

Read before implementation:

* `docs/PRODUCT_SPEC.md`
* `docs/UI_SPEC.md`
* `docs/ARCHITECTURE.md`
* `docs/DEVELOPMENT_PLAN.md`
* `agents/prompts/014-ux-audit.md`

Use the existing documentation and implementation as the source of truth.

Report any inconsistencies before editing.

---

## Requirements

### 1. Mobile finding-to-image interaction

When a user taps a linked strength or weakness on mobile, ensure the associated annotation becomes visible and understandable.

Preferred MVP behavior:

* Selecting a finding should smoothly scroll the annotated creative into view.
* The associated marker and bounding-box outline should remain selected.
* The user should be able to immediately see which visual area the finding refers to.
* Avoid excessive or disorienting scrolling.

Do not add a permanently sticky image thumbnail unless the current layout makes the scroll-to-image behavior unusable.

Desktop hover and click behavior should remain unchanged.

---

### 2. Marker touch targets

Improve mobile marker usability:

* Preserve the current visual marker size unless a small visual increase is necessary.
* Increase the invisible interactive hit area toward a comfortable touch target of approximately 44px.
* Ensure enlarging the hit area does not visually clutter the creative.
* Markers must remain keyboard focusable.
* Focus states should remain visible.

---

### 3. Marker collision handling

Prevent annotation markers from rendering directly on top of one another or becoming too tightly clustered.

Implement a simple and predictable overlap-avoidance strategy.

Possible approaches include:

* Adjusting generated marker positions when bounding-box centers are too close.
* Applying a small deterministic offset.
* Using a minimum distance between marker centers.

Requirements:

* Keep markers inside the image boundaries.
* Preserve the relationship between each marker and its bounding box.
* Avoid introducing random movement between renders.
* Keep the solution intentionally simple for the MVP.

If collision handling belongs in the mock engine rather than the presentation component, explain why before implementing.

---

### 4. Accessibility labels

Update each marker’s accessible label so it includes the associated finding.

Examples:

* `Strength: Product remains clear at thumbnail size`
* `Weakness: Call to action blends into the background`

Do not use generic labels such as only:

* `Strength highlight`
* `Weakness highlight`

Ensure keyboard and screen-reader users can distinguish every marker.

---

### 5. Mobile selection behavior

Maintain the documented mobile interaction:

* Tap a marker to select it.
* Tap a finding to select its marker.
* Tap a different item to change selection.
* Tap the selected item again to deselect it, where practical.
* Selection state should remain synchronized between the image and report list.

---

## Design Direction

Maintain Verdict’s existing visual language:

* Minimal
* Premium
* Calm
* Precise
* Electric Lime reserved for brand interaction
* Semantic strength and weakness colors preserved

Do not add decorative motion or additional marker colors.

---

## Constraints

Do not redesign the Verdict report.

Do not add numbered markers in this milestone.

Do not add recommendation hotspots.

Do not change the report data model unless required for collision handling.

Do not modify recommendation behavior.

Do not add a sticky mobile thumbnail unless the preferred scroll-to-image solution proves inadequate.

Do not alter desktop behavior unnecessarily.

---

## Acceptance Criteria

The task is complete when:

* Tapping a strength or weakness on mobile makes the corresponding annotation visible.
* Marker touch targets are comfortable without making the visible markers oversized.
* Markers no longer overlap or cluster unreasonably.
* Each marker has a unique, descriptive accessible label.
* Marker/list selection remains synchronized.
* Desktop hover and click behavior still works.
* Keyboard navigation still works.
* The report remains responsive.
* Missing-report behavior still works.
* No console errors.
* Lint and build pass.

---

## Testing Requirements

Test at minimum:

* Mobile viewport around 375px wide.
* Tablet viewport around 768px wide.
* Desktop viewport.
* A report with several annotations.
* Two annotations whose original centers are close together.
* Marker selection from the image.
* Finding selection from the list.
* Repeated tap to deselect.
* Keyboard focus through all markers.
* Screen-reader labels through the browser accessibility tree.

---

## Deliverables

Before making changes:

1. Summarize your understanding.
2. List the files you intend to create or modify and why.
3. Explain your proposed mobile scroll behavior.
4. Explain where collision handling should live.
5. Identify any risks or documentation conflicts.
6. Wait for approval.

After implementation:

1. Summarize files changed.
2. Explain how the mobile interaction works.
3. Explain the collision-handling strategy.
4. Provide detailed manual testing steps.
5. Note known limitations.
6. Suggest a Git commit message.
