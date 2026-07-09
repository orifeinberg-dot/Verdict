# 013 - Implement Campaign Context Fields

## Objective

Implement the Campaign Type and conditional Occasion fields on the `/analyze` page and integrate them into the existing Verdict data pipeline.

This milestone should extend the current user flow without changing the overall page layout or introducing new product features.

---

## Background

Prompt 012 documented the new campaign context fields.

This implementation should follow the documented behavior and integrate seamlessly with the existing Verdict infrastructure built in Prompt 009.

---

## References

Before implementing, review:

* `docs/PRODUCT_SPEC.md`
* `docs/UI_SPEC.md`
* `docs/ARCHITECTURE.md`
* `docs/DEVELOPMENT_PLAN.md`
* `agents/prompts/012-design-campaign-context-fields.md`

These documents are the source of truth.

If any inconsistencies exist, report them before making changes.

---

## Requirements

### Campaign Type

Add a required dropdown field named **Campaign Type**.

Options:

* Evergreen
* Promotion
* Sale
* Product Launch
* Holiday
* Seasonal
* Retargeting
* Brand Awareness
* Other

---

### Occasion

Add an optional dropdown named **Occasion**.

The field should only be visible when Campaign Type is:

* Promotion
* Sale
* Holiday
* Seasonal
* Other

Options:

* None
* Black Friday
* Cyber Monday
* Christmas
* Valentine's Day
* Mother's Day
* Father's Day
* Back to School
* New Year
* Summer Sale
* Spring Sale
* Other

Default value:

* None

When Campaign Type changes to a value that does not support Occasion, the Occasion field should automatically reset to **None**.

---

## User Experience

The new fields should integrate naturally into the existing form.

Maintain:

* Premium minimal appearance
* Existing spacing
* Existing typography
* Existing component styling
* Existing validation behavior

The conditional appearance/disappearance of Occasion should feel smooth and intentional.

---

## Data Pipeline

Update the existing pipeline so that:

* Campaign Type becomes part of `CreativeContext`.
* Occasion becomes part of `CreativeContext`.
* Both values reach the mock Verdict engine.
* The generated report reflects these values when appropriate.

Examples:

* Black Friday creatives should place more emphasis on urgency and offer clarity.
* Evergreen creatives should avoid unnecessary urgency.
* Product Launch creatives should emphasize differentiation and product clarity.

Do not invent new report sections.

Use the existing Verdict structure.

---

## Constraints

Do not redesign the Analyze page.

Do not modify the Verdict page.

Do not add OpenAI integration.

Do not add database persistence.

Do not change ReportStore.

Do not modify unrelated validation logic.

Keep implementation consistent with the existing architecture.

---

## Acceptance Criteria

The task is complete when:

* Campaign Type is implemented.
* Occasion appears only for supported Campaign Types.
* Occasion resets to **None** when hidden.
* Existing validation still works.
* The mock engine can reference the new context.
* `/verdict/[id]` continues to work.
* No console errors.
* App builds successfully.

---

## Deliverables

Before making changes:

1. Summarize your understanding.
2. List the files you intend to modify and why.
3. Identify any risks or implementation simplifications.
4. Wait for my approval before editing.

After implementation:

1. Summarize the files changed.
2. Explain how to test the new behavior.
3. List any known limitations.
4. Suggest a Git commit message.
