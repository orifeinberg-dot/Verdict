# 020 - Report Language and Taxonomy Cleanup

## Objective

Resolve the remaining terminology and classification issues identified during manual QA before defining Verdict’s AI methodology.

This milestone focuses on:

- misleading category placement,
- awkward internal terminology exposed to users,
- and overlapping Campaign type options.

Do not add OpenAI integration or redesign the report.

---

## Background

Manual testing identified several language and taxonomy issues:

1. The category label **Policy Risk** can appear in the Strengths section, where it reads as contradictory or misleading.
2. The word **blocking** appears throughout the report and feels too technical or unnatural for Verdict’s product voice.
3. The Campaign type options **Promotion**, **Sale**, **Seasonal**, and **Holiday** overlap conceptually and all expose similar Occasion choices, creating unnecessary cognitive load.

The empty Strengths/Weaknesses state hierarchy has already been fixed and is not part of this task. These issues come directly from the pre-OpenAI audit. :contentReference[oaicite:0]{index=0}

---

## References

Read before implementation:

- `docs/PRODUCT_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_PLAN.md`
- `agents/prompts/013-implement-campaign-context-fields.md`
- `agents/prompts/018-verdict-report-trust-and-clarity.md`
- Current report and mock-engine implementation

Use the current code and documentation as the source of truth.

Report any conflicts before editing.

---

## Requirements

### 1. Correct the Policy Risk category behavior

Review how `Policy Risk` is assigned and displayed.

A finding categorized as Policy Risk should not appear in Strengths unless the wording and category make clear that it represents policy safety rather than risk.

Preferred approach:

- Reserve **Policy Risk** for weaknesses or concerns.
- If a positive finding is needed, use a separate positive category label or wording such as:
  - Policy compliance
  - Policy readiness
  - No obvious policy concern

Do not display a positive strength under a label that sounds inherently negative.

Keep the category system simple and avoid adding unnecessary categories.

---

### 2. Replace “blocking” terminology

Review all user-facing uses of:

- blocking,
- blocking weakness,
- blocker,
- or similar technical language.

Replace them with language that better matches Verdict’s voice.

Preferred terminology:

- **Critical issue** for the user-facing label
- **Must fix before launch** where an explanatory phrase is needed

Internal property names such as `blocking: boolean` may remain unchanged if renaming them would create unnecessary code churn. The priority is user-facing language.

The wording should feel:

- direct,
- professional,
- understandable to marketers,
- and less like software error terminology.

Do not weaken the meaning of genuinely launch-preventing issues.

---

### 3. Simplify Campaign type taxonomy

Review the overlap between:

- Promotion
- Sale
- Holiday
- Seasonal

The current model is difficult to explain because these options can describe the same campaign and lead to the same Occasion dropdown.

Simplify the Campaign type options for the MVP.

Recommended taxonomy:

- Evergreen
- Promotion
- Product Launch
- Retargeting
- Brand Awareness
- Other

Under this model:

- **Promotion** covers sales, discounts, limited-time offers, holiday promotions, and seasonal promotions.
- **Occasion** provides the specific event or seasonal context, such as Black Friday, Christmas, Valentine’s Day, or Summer Sale.

Remove **Sale**, **Holiday**, and **Seasonal** as standalone Campaign type options unless there is a strong product reason to retain any of them.

Update conditional Occasion behavior accordingly:

- Show Occasion when Campaign type is:
  - Promotion
  - Other

Occasion remains optional and defaults to None.

---

### 4. Preserve existing reports safely

Existing reports stored in `sessionStorage` may contain removed Campaign type values.

Handle them gracefully:

- Do not crash when loading older stored reports.
- Continue rendering understandable labels for legacy values where practical.
- New submissions should only use the simplified taxonomy.

Do not build a formal migration system for sessionStorage.

---

### 5. Update mock-engine context behavior

Update campaign-context logic so it continues to behave coherently after simplifying Campaign type.

Examples:

- A Promotion with Black Friday should emphasize urgency and offer clarity.
- An Evergreen campaign should be checked for artificial or unnecessary urgency.
- Product Launch should emphasize differentiation and product clarity.

Do not overhaul scoring or verdict semantics in this milestone.

Those decisions belong in the next methodology milestone.

---

## Documentation Updates

Update the relevant sections of:

- `docs/PRODUCT_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_PLAN.md`

Document:

- the final Campaign type options,
- the relationship between Campaign type and Occasion,
- the approved user-facing replacement for “blocking,”
- and the corrected Policy Risk behavior.

---

## Constraints

Do not:

- add OpenAI integration,
- define Launch/Test/Don’t Launch thresholds,
- define confidence-score semantics,
- redesign the Analyze page,
- redesign the Verdict report,
- alter annotation interactions,
- add a database,
- add authentication,
- build a full data migration system.

Keep this milestone focused on terminology and taxonomy.

---

## Acceptance Criteria

The task is complete when:

- Policy Risk no longer appears misleadingly in Strengths.
- Positive policy-related findings use appropriate positive language if retained.
- User-facing “blocking” terminology is replaced consistently.
- Critical findings retain their intended severity.
- Campaign type options are simplified and understandable.
- Occasion appears under the documented conditions.
- Existing stored reports do not crash.
- New reports use the updated taxonomy and language.
- Documentation matches implementation.
- The full Analyze → Verdict flow still works.
- Lint and build pass.
- No console errors occur.

---

## Testing Requirements

Test at minimum:

1. A report containing a policy-related weakness.
2. A report containing any positive policy-related observation.
3. A report containing a critical issue.
4. Search the rendered UI for any remaining user-facing “blocking” wording.
5. Submit each new Campaign type option.
6. Confirm Occasion appears for Promotion and Other.
7. Confirm Occasion stays hidden for other Campaign types.
8. Load or simulate a legacy report containing Sale, Holiday, or Seasonal.
9. Complete the full Analyze → Verdict flow.
10. Test desktop and mobile layouts.

---

## Deliverables

Before making changes:

1. Summarize your understanding.
2. List every file you intend to modify and why.
3. Explain your proposed resolution for Policy Risk in Strengths.
4. Confirm the final user-facing replacement for “blocking.”
5. Explain the proposed Campaign type taxonomy and legacy-value handling.
6. Flag risks, documentation conflicts, or simplifications.
7. Wait for explicit approval.

After implementation:

1. Summarize files changed.
2. Explain the Policy Risk correction.
3. List all user-facing terminology changes.
4. Explain the final Campaign type and Occasion behavior.
5. Provide manual testing steps.
6. Note known limitations.
7. Suggest a Git commit message.