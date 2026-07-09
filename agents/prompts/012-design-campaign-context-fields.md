# 012 - Design Campaign Context Fields

## Objective

Design how Verdict should collect campaign context on the `/analyze` page.

This is a documentation-only task.

Do not modify production code.

## Background

Verdict currently collects basic creative context, but it does not yet ask whether the creative is part of a specific campaign type or occasion.

We want to add context that helps Verdict judge the creative more accurately without making the form feel cluttered.

## Requirements

Design two new fields:

### Campaign Type

Required field.

Suggested options:

* Evergreen
* Promotion
* Sale
* Product Launch
* Holiday
* Seasonal
* Retargeting
* Brand Awareness
* Other

### Occasion

Conditional field.

Only show this when Campaign Type is:

* Holiday
* Seasonal
* Promotion
* Sale
* Other, if relevant

Suggested options:

* None
* Black Friday
* Cyber Monday
* Christmas
* Valentine’s Day
* Mother’s Day
* Father’s Day
* Back to School
* New Year
* Summer Sale
* Spring Sale
* Other

## UX Principles

* Keep the form clean and premium.
* Do not overload the user.
* Campaign Type should help the AI understand the strategic context.
* Occasion should only appear when useful.
* The fields should feel like a professional marketer’s workflow, not a generic holiday selector.

## Documentation Updates

Update relevant sections of:

* `docs/PRODUCT_SPEC.md`
* `docs/UI_SPEC.md`
* `docs/ARCHITECTURE.md`
* `docs/DEVELOPMENT_PLAN.md`

## Acceptance Criteria

* Campaign Type and Occasion behavior are clearly specified.
* Conditional display logic is documented.
* Data model implications are documented.
* AI evaluation implications are documented.
* No production code is changed.

## Deliverables

Before editing:

1. Summarize your understanding.
2. List which docs you intend to update.
3. Flag any concerns.
4. Wait for approval.

After editing:

1. Summarize what changed.
2. Recommend the next implementation prompt.
