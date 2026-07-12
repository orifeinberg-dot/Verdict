# 018 - Improve Verdict Report Trust and Clarity

## Objective

Improve the Verdict report so users can immediately confirm which campaign context was analyzed and clearly understand the difference between:

* What is wrong
* What should be done next

This milestone focuses on trust, context visibility, and report clarity.

Do not add OpenAI integration, database persistence, authentication, sharing, export, or new report sections beyond what is required here.

---

## Background

The UX audit identified two high-impact issues on the Verdict report:

1. The report does not show the campaign context submitted by the user, even though the mock engine already receives and uses that context.
2. Recommendations often feel like rewritten versions of the Weaknesses list rather than a distinct action layer.

Before integrating OpenAI, the report should make the submitted context visible and make recommendations read as clear next steps rather than repeated criticism.

---

## References

Read before implementation:

* `docs/PRODUCT_SPEC.md`
* `docs/UI_SPEC.md`
* `docs/ARCHITECTURE.md`
* `docs/DEVELOPMENT_PLAN.md`
* `agents/prompts/014-ux-audit.md`
* Current Verdict report implementation

Use the current documentation and code as the source of truth.

Report any conflicts before editing.

---

## Requirements

### 1. Add a Campaign Context Summary

Add a compact context summary near the top of `/verdict/[id]`.

It should confirm the main inputs used for the analysis.

Include:

* Brand
* Campaign objective
* Campaign type
* Occasion, only when it is present and not `None`
* Target audience, only when provided

Do not show Website in this summary unless there is a clear UX reason to do so.

The context summary should:

* Be visually subordinate to the Verdict badge and executive summary.
* Be easy to scan.
* Feel like confirmation, not a new report section.
* Use concise labels.
* Preserve the minimal, premium design.
* Avoid a heavy card, large border, or dense metadata table.

A compact inline strip, wrapped group of metadata items, or similarly restrained treatment is preferred.

---

### 2. Clarify Weaknesses Versus Recommendations

Maintain both sections, but strengthen their distinct roles.

#### Weaknesses

Weaknesses should communicate:

* What is reducing the creative’s effectiveness
* Where the problem appears
* Why it matters

They should remain diagnostic.

#### Recommendations

Recommendations should communicate:

* What the user should change
* The concrete next action
* The expected improvement

They should feel prescriptive and practical.

Do not add a new AI synthesis system in this milestone.

Do not redesign the mock engine extensively.

Use presentation and small copy-structure improvements to make the distinction clearer.

Possible approaches:

* Add a short section description beneath each heading.
* Use action-oriented formatting for recommendations.
* Number recommendations.
* Add a concise action verb or “Next step” treatment.
* Visually connect a recommendation to a related weakness only if this can be done cleanly with the existing data model.

Avoid duplicating the full Weakness text inside Recommendations.

---

### 3. Preserve Annotation Behavior

Do not change:

* Strength and weakness hotspot logic
* Mobile directional scrolling
* Collision handling
* Marker accessibility behavior
* Recommendation hotspot rules

Recommendations must remain unlinked to visual markers.

---

### 4. Preserve Report Hierarchy

The page hierarchy should remain:

1. Verdict outcome
2. Confidence
3. Executive summary
4. Campaign context confirmation
5. Annotated creative and findings
6. Recommendations
7. Report actions

The context strip must not compete with the Verdict itself.

---

## Design Direction

Maintain Verdict’s design language:

* Swiss minimalism
* Clear hierarchy
* Generous whitespace
* Calm typography
* Electric Lime reserved for interaction
* Semantic verdict and annotation colors preserved
* Minimal visual noise

The report should feel more trustworthy and useful without becoming denser.

---

## Constraints

Do not:

* Add OpenAI integration.
* Add a database.
* Add authentication.
* Add sharing or export.
* Add saved history.
* Add a new report data model unless absolutely necessary.
* Add recommendation hotspots.
* Redesign the whole report.
* Change the Verdict engine’s scoring logic.
* Add speculative performance claims.

Keep this a focused report-clarity milestone.

---

## Acceptance Criteria

The task is complete when:

* The report visibly confirms the submitted campaign context.
* Occasion is only shown when meaningful.
* Optional target audience is handled cleanly.
* The context summary does not overpower the Verdict.
* Weaknesses read as diagnosis.
* Recommendations read as concrete next actions.
* Recommendations do not feel like exact duplicates of Weaknesses.
* Existing annotation interactions still work.
* Mobile and desktop layouts remain responsive.
* Missing-report fallback still works.
* Refreshing the report still works through `sessionStorage`.
* No console errors occur.
* Lint and build pass.

---

## Testing Requirements

Test at minimum:

1. Report with Brand, Campaign objective, and Campaign type.
2. Report with Occasion set to Black Friday.
3. Report with Occasion set to None.
4. Report with Target audience provided.
5. Report with Target audience empty.
6. Desktop layout.
7. Mobile layout around 375px.
8. Several Weaknesses and Recommendations.
9. Annotation marker-to-finding interaction.
10. Finding-to-image interaction.
11. Missing report fallback.
12. Refreshing a valid report.

---

## Deliverables

Before making changes:

1. Summarize your understanding.
2. List the files you intend to create or modify and why.
3. Describe your proposed context-summary design.
4. Explain how you will make Recommendations feel distinct from Weaknesses without overhauling the engine.
5. Flag any risks, documentation conflicts, or simplifications.
6. Wait for explicit approval.

After implementation:

1. Summarize files changed.
2. Explain the context-summary treatment.
3. Explain the Weaknesses/Recommendations distinction.
4. Provide manual testing steps.
5. Note known limitations.
6. Suggest a Git commit message.
