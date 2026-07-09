# 009 - Implement Verdict Infrastructure

## Objective

Implement the core Verdict data pipeline using mock analysis data.

This milestone should connect the existing `/analyze` experience to a real `/verdict/[id]` route without adding OpenAI integration, database, authentication, payments, or saved user history.

The goal is to replace the current fake timeout navigation to `/verdict/demo` with a real mock-report pipeline.

---

## Background

The project now has:

- Landing page
- Analyze page
- Image validation
- Loading experience
- Electric Lime brand identity
- Verdict report UX documented in the project docs

The next step is to create the infrastructure that allows the app to:

1. Accept a validated creative and context from `/analyze`
2. Generate a mock Verdict report
3. Store the report in `sessionStorage`
4. Navigate to `/verdict/[id]`
5. Load the report on the Verdict page

This prepares the app for the polished Verdict UI and later OpenAI integration.

---

## References

Read before implementation:

- `docs/PRODUCT_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_PLAN.md`
- `agents/prompts/008-design-verdict-report.md`

Use the docs as the source of truth.

If there are inconsistencies, report them before changing code.

---

## Requirements

### 1. Add shared Verdict types

Create shared TypeScript types for the report data model.

The model should support:

- Report id
- Uploaded creative preview
- Brand/context inputs
- Verdict outcome:
  - `launch`
  - `test`
  - `dont_launch`
- Confidence score
- Executive summary
- Strengths
- Weaknesses
- Recommendations
- Category scores, if already documented
- Visual annotation points for strengths and weaknesses only

Do not include recommendation hotspots.

---

### 2. Add mock Verdict engine

Create a mock engine that returns a realistic Verdict report from the submitted form data.

The mock report should use the documented Verdict voice:

- Direct
- Specific
- Practical
- Senior growth marketer tone
- Not generic AI assistant language

This engine is temporary and will later be replaced or wrapped by the OpenAI integration.

---

### 3. Add ReportStore abstraction

Create a small report storage abstraction backed by `sessionStorage`.

It should support:

- Save report by id
- Retrieve report by id
- Handle missing reports gracefully
- Keep storage logic isolated in one place so it can later be replaced by database-backed fetching

Document the limitation in code comments if appropriate:

- Works in the same browser session
- Survives refresh in the same tab/session
- Not shareable across devices yet

---

### 4. Update `/analyze` submit flow

Replace the current fake navigation to `/verdict/demo`.

When the user clicks Analyze:

1. Validate that the current form/upload state is acceptable.
2. Show the existing premium loading state.
3. Generate a mock Verdict report.
4. Save it through ReportStore.
5. Navigate to `/verdict/[id]`.

Do not call OpenAI yet.

Do not add database persistence.

---

### 5. Add `/verdict/[id]` route

Create the dynamic Verdict route.

For this milestone, the page can display a simple but readable development version of the report.

It does **not** need to be the final polished report UI yet.

It should confirm that:

- The correct report loads from the id.
- Missing/expired reports show a clear fallback message.
- The uploaded image preview can be displayed.
- Report fields are available.

A polished Verdict UI will be implemented in the next milestone.

---

## Constraints

Do not add OpenAI integration.

Do not add database, auth, payments, or user history.

Do not redesign the landing page.

Do not redesign the analyze page beyond what is required for the submit flow.

Do not implement final visual annotation UI yet.

Do not add recommendation hotspots.

Keep the implementation simple and easy to replace later.

---

## Acceptance Criteria

This task is complete when:

- Clicking Analyze no longer routes to `/verdict/demo`.
- A mock report is generated.
- The report is stored in `sessionStorage`.
- The user is routed to `/verdict/[id]`.
- Refreshing `/verdict/[id]` in the same session still loads the report.
- Opening a missing/invalid report id shows a clear fallback state.
- No OpenAI call is made.
- No database is added.
- App runs with `npm run dev`.
- No console errors.
- Lint/build pass if available.

---

## Deliverables

Before making changes:

1. Summarize your understanding of the task.
2. List files you intend to create or modify.
3. Flag any risks or inconsistencies.
4. Wait for approval.

After implementation:

1. Summarize files changed.
2. Explain how to test the full flow.
3. Note any known limitations.
4. Suggest a Git commit message.