# 005 - Build Loading Experience

## Objective

Create a premium mock analysis/loading experience after the user clicks Analyze on `/analyze`.

This milestone should not add OpenAI integration, database, auth, or real analysis behavior yet.

## Requirements

When the user clicks Analyze:

- Show a dedicated analysis/loading state.
- Do not use a generic spinner as the main experience.
- Display calm progressive messages such as:
  - Reading creative...
  - Evaluating hierarchy...
  - Reviewing CTA...
  - Assessing clarity...
  - Preparing Verdict...
- Use subtle animation.
- Preserve the premium Apple-inspired aesthetic.
- After the mock loading sequence completes, navigate to a temporary mock route such as `/verdict/demo`.

## Acceptance Criteria

- Clicking Analyze triggers the loading experience.
- Loading feels polished and intentional.
- No AI call is made.
- No database is added.
- User eventually reaches `/verdict/demo`.
- App runs with `npm run dev`.
- No console errors.