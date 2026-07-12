# 017 - Improve Analyze Flow Discipline

## Objective

Reduce friction and conceptual confusion on the `/analyze` page while preserving the existing premium visual design and working analysis pipeline.

This milestone focuses on form clarity, required-field discipline, mobile usability, and consistency.

Do not add OpenAI integration or redesign the page.

---

## Background

The UX audit identified several issues in the Analyze experience:

1. Campaign objective and Campaign type are conceptually different but visually presented as unrelated fields, making their distinction harder to understand.
2. Website is currently required even though the mock engine does not meaningfully use it.
3. Field-label capitalization is inconsistent.
4. Mobile form controls sit at the minimum comfortable touch-target height.
5. The loading experience currently lasts approximately 4.7 seconds, but real OpenAI latency is not yet known.

The goal is to improve the form now without making premature decisions about loading duration before the real AI engine is integrated.

---

## References

Read before implementation:

* `docs/PRODUCT_SPEC.md`
* `docs/UI_SPEC.md`
* `docs/ARCHITECTURE.md`
* `docs/DEVELOPMENT_PLAN.md`
* `agents/prompts/014-ux-audit.md`

Use the current documentation and implementation as the source of truth.

Report any conflicts before editing.

---

## Requirements

### 1. Clarify Campaign Objective and Campaign Type

Preserve both fields because they provide different information.

Their distinction is:

* **Campaign objective** — the Meta optimization or funnel goal, such as awareness, traffic, conversions, or app installs.
* **Campaign type** — the strategic or promotional context, such as evergreen, sale, product launch, holiday, seasonal, or retargeting.

Improve the form so this distinction is immediately understandable.

Use one or both of the following approaches as appropriate:

* Add concise helper text beneath each field.
* Visually group the two fields under a subtle section label such as **Campaign context**.

Keep the treatment minimal. Do not add a heavy card, large divider, or excessive explanatory copy.

Avoid wording that makes the form feel technical.

---

### 2. Make Website Optional

Website should no longer block form submission while the mock engine does not meaningfully use it.

Requirements:

* Remove the required constraint from the Website field.
* Clearly mark it as optional.
* Preserve the submitted value when provided.
* Continue passing it through `CreativeContext`.
* The Server Action must accept an empty Website value.
* Do not remove the field entirely, because it will become useful during OpenAI integration.

---

### 3. Standardize Field Labels

Use consistent sentence case across all Analyze form labels.

Examples:

* Brand
* Website
* Industry
* Campaign objective
* Campaign type
* Occasion
* Target audience

Preserve proper nouns where appropriate.

---

### 4. Improve Mobile Touch Targets

Increase the mobile height of form controls so they feel comfortable and premium rather than sitting at the minimum touch-target threshold.

Apply this consistently to:

* Text inputs
* Select controls
* Other form controls in the Analyze workspace where appropriate

Recommended behavior:

* Approximately 52–56px high on mobile.
* Revert to the existing desktop height at the `md` breakpoint if necessary to preserve desktop appearance.
* Keep text vertically centered.
* Preserve the existing spacing and typography hierarchy.
* Do not make the form visually oversized.

The upload drop zone does not need to be enlarged unless testing reveals a separate usability issue.

---

### 5. Preserve Loading Timing for Now

Do not change the current loading-sequence duration in this milestone.

Reason:

* The real latency of the future OpenAI analysis is not known yet.
* Loading timing should be tuned once the real engine is integrated.
* Changing it now risks optimizing around mock-engine behavior that will soon be replaced.

Add or update a concise documentation note stating that loading duration must be revisited during OpenAI integration.

Do not add artificial new loading steps or animation.

---

## Design Direction

Maintain Verdict’s current design language:

* Swiss minimalism
* Generous whitespace
* Calm typography
* Electric Lime reserved for interactive emphasis
* Minimal visual noise
* Clear, concise helper text
* Strong mobile usability

The form should feel easier to understand without feeling more complicated.

---

## Constraints

Do not:

* Add OpenAI integration.
* Change the analysis result structure.
* Modify the Verdict report UI.
* Modify annotation behavior.
* Add database persistence.
* Add authentication.
* Remove Campaign objective or Campaign type.
* Build custom select components.
* Change loading duration.
* Redesign the Analyze page.

Keep this a contained UX refinement.

---

## Acceptance Criteria

The task is complete when:

* Campaign objective and Campaign type are clearly distinguishable.
* Website is optional and no longer blocks submission.
* Website is still passed through the pipeline when provided.
* All form labels use consistent sentence case.
* Mobile form controls have comfortable touch-target heights.
* Desktop form appearance remains consistent.
* Occasion conditional behavior still works.
* Existing image validation still works.
* `/analyze` still generates and navigates to `/verdict/[id]`.
* Loading timing remains unchanged.
* Documentation notes that loading timing will be revisited during OpenAI integration.
* No console errors occur.
* Lint and build pass.

---

## Testing Requirements

Test at minimum:

1. Submit with Website left empty.
2. Submit with Website provided.
3. Compare Campaign objective and Campaign type labels/helper text for clarity.
4. Test all Campaign type values.
5. Confirm Occasion still appears and resets correctly.
6. Test the form around 375px mobile width.
7. Test around the `md` breakpoint.
8. Test desktop layout.
9. Confirm all image validation behavior remains intact.
10. Complete the full Analyze → Loading → Verdict flow.

---

## Deliverables

Before making changes:

1. Summarize your understanding.
2. List the files you intend to modify and why.
3. Explain how you propose to distinguish Campaign objective from Campaign type.
4. Explain your mobile control-sizing approach.
5. Flag any risks, documentation conflicts, or simplifications.
6. Wait for explicit approval.

After implementation:

1. Summarize files changed.
2. Explain the form-clarity improvements.
3. Explain how Website optionality was implemented.
4. Provide detailed manual testing steps.
5. Note known limitations.
6. Suggest a Git commit message.
