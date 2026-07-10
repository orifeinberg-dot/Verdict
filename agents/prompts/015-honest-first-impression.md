# 015 - Honest First Impression

## Objective

Improve the first impression and trustworthiness of Verdict before OpenAI integration.

This milestone focuses on making the landing page accurately represent the current MVP while increasing confidence for first-time visitors.

---

## Background

The UX audit identified two issues that affect every new visitor:

1. The landing page currently describes Verdict as AI-powered even though the application still uses a mock analysis engine.
2. The landing page provides no visual preview of what users will receive after completing an analysis.

Before integrating OpenAI, the product should communicate honestly while still creating excitement.

---

## References

Read before implementation:

* `docs/PRODUCT_SPEC.md`
* `docs/UI_SPEC.md`
* `docs/ROADMAP.md`
* `agents/prompts/014-ux-audit.md`

Use these documents as the source of truth.

---

## Requirements

### Trust

Review every user-facing mention of "AI-powered."

Replace wording that could mislead users while the application still runs on the mock engine.

The copy should remain compelling without implying capabilities that do not yet exist.

---

### Landing Page Preview

Implement a small, static preview of the Verdict experience.

Requirements:

* Non-interactive.
* Clearly presented as an example.
* Consistent with the current Verdict visual language.
* Shows enough of the report to help users understand what they will receive.
* Must not introduce new application states or complexity.

The preview should reinforce the CTA rather than distract from it.

---

### Design

Maintain:

* Swiss minimalism
* Electric Lime accent
* Premium spacing
* Calm typography
* Existing brand identity

---

## Constraints

Do not add OpenAI.

Do not redesign the landing page.

Do not modify the analysis flow.

Do not add new features.

Do not introduce fake interactions.

---

## Acceptance Criteria

The task is complete when:

* The landing page no longer overstates the product's capabilities.
* First-time users immediately understand what Verdict produces.
* The preview feels polished and integrated into the design.
* Existing responsiveness is preserved.
* No console errors.
* App runs successfully.

---

## Deliverables

Before implementation:

1. Summarize your understanding.
2. List files you intend to modify.
3. Suggest any refinements that improve trust without expanding scope.
4. Wait for approval.

After implementation:

1. Summarize files changed.
2. Explain how to review the new landing page.
3. Suggest a Git commit message.
