# Milestone 027 — Add Deterministic Pipeline Tests

## Objective

Add focused automated tests for the deterministic reasoning and validation layers introduced in Milestones 024–026.

The purpose of this milestone is to lock the current business rules before introducing a real AI perception layer.

This milestone must not change production behavior.

---

## Background

Verdict now contains three distinct stages:

```text
Generate findings
        ↓
Validate findings
        ↓
Compute deterministic decisions
        ↓
Return VerdictReport
```

The relevant modules are:

```text
lib/verdict/decision-engine.ts
lib/verdict/validation.ts
lib/verdict/mock-engine.ts
```

The decision and validation rules have been manually verified, but they are not yet protected by automated regression tests.

Before an AI perception layer begins producing findings, these deterministic contracts should be executable and independently verifiable.

---

## Deliverables

Add automated tests covering:

```text
lib/verdict/decision-engine.ts
lib/verdict/validation.ts
```

Use the testing setup already present in the repository.

If no test framework is currently configured, add the smallest appropriate test setup compatible with the existing Next.js and TypeScript project.

Do not introduce a browser-testing framework for this milestone.

---

## Required Decision-Engine Coverage

### 1. `computeVerdict()`

Verify:

- a blocking weakness produces `dont_launch`;
- a notable non-blocking weakness produces `test`;
- no meaningful weaknesses produces `launch`;
- verdict selection is deterministic;
- weakness order does not improperly override severity rules.

Use the exact verdict values defined in the current domain types.

Do not rewrite the business rules inside the tests.

---

### 2. `computeConfidence()`

Verify:

- identical inputs produce identical confidence values;
- confidence remains within the valid domain range;
- greater evaluation coverage does not reduce the coverage component;
- finding sufficiency behaves according to the current Phase 1 implementation;
- empty findings and empty coverage are handled without exceptions.

Tests must reflect the implementation currently documented in `decision-engine.ts`.

Do not add the future validation-agreement signal in this milestone.

---

### 3. `selectAnchorFinding()`

Verify:

- `dont_launch` selects an appropriate blocking weakness;
- `test` selects an appropriate non-blocking weakness;
- `launch` selects an appropriate strength;
- tie-breaking is deterministic;
- empty candidate collections are handled according to the current function contract.

Do not change anchor-selection behavior merely to make a preferred test pass.

---

### 4. `assembleExecutiveSummary()`

Verify:

- summaries are deterministic;
- the summary reflects the supplied verdict;
- the selected anchor finding is represented appropriately;
- context-dependent text uses the current context contract;
- missing-anchor behavior follows the existing implementation.

Avoid brittle assertions against incidental whitespace unless exact output is part of the documented contract.

---

## Required Validation Coverage

Test:

```ts
validateWeaknesses()
```

Verify:

- `brand_consistency` with `blocking: true` becomes `blocking: false`;
- `policy_risk` may retain `blocking: true`;
- `legibility` may retain `blocking: true`;
- `message_clarity` may retain `blocking: true`;
- non-blocking weaknesses remain unchanged;
- all weaknesses remain present;
- array order is preserved;
- the input array is not mutated;
- normalized weakness objects are newly created;
- unchanged weakness objects may retain their references;
- repeated validation produces equivalent output.

The eligibility rule must continue to be sourced from production validation behavior rather than duplicated as an alternative implementation in the test suite.

---

## Test Fixtures

Use small, explicit fixture builders or factory helpers where they improve readability.

Fixtures should:

- use valid domain types;
- contain only the fields required by the existing contracts;
- make the relevant category, blocking state, summary, and evidence visible;
- avoid randomness;
- avoid `crypto.randomUUID()` where fixed IDs are sufficient;
- remain local to the test files unless reuse clearly justifies a shared helper.

Do not create a large generalized test-fixture framework.

---

## Test Organization

Prefer focused test files such as:

```text
lib/verdict/decision-engine.test.ts
lib/verdict/validation.test.ts
```

Follow the repository's existing naming convention if one already exists.

Tests should describe behavior rather than implementation details.

Good:

```text
normalizes blocking brand-consistency weaknesses
```

Avoid:

```text
calls map and spreads the object
```

---

## Constraints

Do NOT:

- modify verdict business rules;
- modify validation rules;
- modify `mock-engine.ts` unless a minimal testability change is genuinely unavoidable;
- modify report types;
- modify UI;
- add OpenAI;
- add snapshot tests for entire reports;
- add end-to-end browser tests;
- introduce random test data;
- add future validation rules;
- refactor unrelated production code;
- weaken assertions simply to make tests pass.

If a test reveals a possible production defect, report it before changing production behavior unless the fix is clearly mechanical and required by the existing documented contract.

---

## Verification

Run:

- the new test suite;
- the existing test suite, if present;
- the project's relevant type-check or lint command.

Confirm:

- all new tests pass;
- no existing tests regress;
- production behavior is unchanged;
- test execution is deterministic.

---

## Definition of Done

- Automated tests cover all four exported decision-engine functions.
- Automated tests cover blocking eligibility validation.
- All three verdict outcomes are tested.
- Confidence determinism and bounds are tested.
- Anchor selection for each verdict is tested.
- Executive-summary determinism is tested.
- Validation immutability and ordering are tested.
- The `brand_consistency + blocking` regression is explicitly protected.
- Tests contain no randomness.
- Production business logic remains unchanged.
- All tests pass.
- Type-checking or linting succeeds.
- No unrelated files are modified.