import type { CreativeContext } from "../types";

/**
 * Prompt responsibilities — and only these:
 *
 * - Tell the model what role it's playing (a pre-launch ad-creative
 *   reviewer) and what it's looking at (the declared campaign context;
 *   the image itself is attached separately by the caller — see the
 *   "Do not include image-specific information" note below).
 * - Describe the four evaluation dimensions and what counts as observable
 *   evidence within each, so the model knows *what to look for*.
 * - Describe the required output shape in prose, matching
 *   `./schema.ts` field-for-field, so the model knows *how to answer*.
 *
 * What a prompt must never contain: business logic. This module never
 * asks the model to compute a verdict, a confidence score, an executive
 * summary, or which categories are allowed to be launch-blocking. Those
 * rules live in `decision-engine.ts` and `validation.ts` as plain,
 * testable TypeScript — if the same rule were instead encoded as prompt
 * wording, it would stop being deterministic (a rephrasing could silently
 * change model behavior), stop being unit-testable, and stop being
 * enforceable regardless of which vision provider is plugged in behind
 * `PerceptionEngine`. The prompt's only job is to elicit raw observations;
 * every decision made *from* those observations happens after this text
 * has done its job, in code, not in wording.
 *
 * Where each responsibility actually lives, end to end:
 * - **This file** — tells the model what observations to produce and
 *   describes the response format. No business logic.
 * - **`./schema.ts`** — defines the raw provider response shape. Not a
 *   validated domain object, and performs no validation itself.
 * - **A future, OpenAI-specific provider parser/mapper** (not yet
 *   built) — will translate that raw response into a real
 *   `PerceptionResult` (assigning `id`s, narrowing `category` strings).
 * - **`validation.ts`** — owns the deterministic business invariants
 *   (e.g. `blocking`-eligibility) over already-shaped domain objects.
 * - **`decision-engine.ts`** — owns verdict/confidence/anchor/summary
 *   logic, entirely downstream of the above.
 */

const DIMENSION_DESCRIPTIONS = `1. policy_risk — Would Meta's ad review reject or restrict this creative? Look for on-image text density, before/after or comparison framing, and prohibited-claim language (health/finance superlatives, guarantees, restricted imagery).
2. legibility — Would a real viewer, at a mobile thumbnail size and a half-second glance, actually receive the message? Look for text size relative to the canvas, text/background contrast, CTA visual weight against its background, and cropped or occluded elements.
3. brand_consistency — Does the creative reinforce or dilute the stated brand? Look for logo presence, size, and placement; palette match to the stated brand description; tone-of-voice match; and whether the creative feels distinctive or interchangeable with a competitor's.
4. message_clarity — Does a viewer understand what's on offer and what to do next, and does the creative meet the expectations set by the declared campaign type and occasion? Look for a single clear value proposition, presence and clarity of a call-to-action, competing messages, and campaign-specific fit (for example: a visible price or offer for a Promotion, no false urgency on an Evergreen creative, event-specific cues for a declared Occasion).`;

const OUTPUT_FORMAT_INSTRUCTIONS = `Respond with a single JSON object containing exactly three top-level fields: "strengths", "weaknesses", and "recommendations".

- "strengths" is an array of findings. Each finding has: "category" (one of policy_risk, legibility, brand_consistency, message_clarity), "summary" (a short, plain-language takeaway), "evidence" (the specific, literal, observable fact the summary is based on — never a restatement of the summary itself), and optionally "boundingBox" (an object with "x", "y", "width", "height", each a percentage of the image's width or height, from 0 to 100) when the finding is tied to a specific visible region.
- "weaknesses" is an array of findings with the same shape as strengths, plus one additional field: "blocking" (a boolean). Set "blocking" to true only when you judge the issue severe enough that it alone should stop this creative from launching as-is; otherwise set it to false. This is your own observation, not a final decision — it will be independently checked before it affects anything downstream.
- "recommendations" is an array of short, plain strings, each a concrete action to address one of the weaknesses above.

Do not include a verdict, a confidence score, an executive summary, or an "id" field anywhere in the response. Do not include any field not described above.`;

function contextSummary(context: CreativeContext): string {
  const lines = [
    `Brand: ${context.brandName || "(not provided)"}`,
    `Website: ${context.website || "(not provided)"}`,
    `Industry: ${context.industry || "(not provided)"}`,
    `Campaign objective: ${context.campaignObjective}`,
    `Campaign type: ${context.campaignType}`,
  ];
  if (context.occasion && context.occasion !== "none") {
    lines.push(`Occasion: ${context.occasion}`);
  }
  if (context.targetAudience) {
    lines.push(`Target audience: ${context.targetAudience}`);
  }
  return lines.join("\n");
}

/**
 * Builds the text prompt for a future OpenAI Vision perception provider.
 * Pure and deterministic: the same `context` always produces the same
 * string, with no randomness, no timestamps, and no dependency on the
 * image itself — the image is supplied separately by the caller as its
 * own message content, once a real provider exists to attach it.
 */
export function buildPerceptionPrompt(context: CreativeContext): string {
  return `You are Verdict, reviewing a paid ad creative before it launches on Meta. Your job is to observe and report — you do not decide whether the ad should launch, and you do not compute a confidence score.

Evaluate the creative against the following four dimensions:

${DIMENSION_DESCRIPTIONS}

Campaign context for this creative:

${contextSummary(context)}

${OUTPUT_FORMAT_INSTRUCTIONS}`;
}
