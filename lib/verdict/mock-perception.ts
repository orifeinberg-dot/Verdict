import type {
  AnnotatedPoint,
  AnnotationCategory,
  BoundingBox,
  CampaignObjective,
  CampaignType,
  CreativeContext,
  CreativeImage,
  Occasion,
  Weakness,
} from "./types";
import type { PerceptionEngine, PerceptionResult } from "./perception";

const CATEGORIES: AnnotationCategory[] = [
  "policy_risk",
  "legibility",
  "brand_consistency",
  "message_clarity",
];

type Rng = () => number;
type Template = (ctx: CreativeContext) => string;
// `evidence` is paired with its `summary` (rather than drawn from a
// separate pool) so the observable fact always matches the specific
// takeaway drawn alongside it.
type FindingTemplate = { summary: Template; evidence: Template };

// Deterministic per input (same brand/image -> same report), varied across
// inputs — see PRODUCT_SPEC.md's "Mock verdict, then real AI".
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, items: T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomBoundingBox(rng: Rng): BoundingBox {
  const width = randomInt(rng, 12, 28);
  const height = randomInt(rng, 10, 22);
  const x = randomInt(rng, 4, 96 - width);
  const y = randomInt(rng, 4, 96 - height);
  return { x, y, width, height };
}

function objectiveLabel(objective: CampaignObjective): string {
  switch (objective) {
    case "awareness":
      return "awareness";
    case "traffic":
      return "traffic";
    case "conversions":
      return "conversions";
    case "app_installs":
      return "app-install";
  }
}

// Copy follows PRODUCT_SPEC.md's "Voice and tone": direct, specific-
// sounding, confident — not generic best-practices filler. `evidence`
// stays a plain observable fact (per VERDICT_INTELLIGENCE_FRAMEWORK.md's
// AI Contract), never a restatement of `summary`'s conclusion.
const STRENGTH_TEMPLATES: Record<AnnotationCategory, FindingTemplate[]> = {
  policy_risk: [
    {
      summary: () =>
        "No prohibited claims language or misleading before/after framing — this reads as compliant with Meta's policy on the first pass.",
      evidence: () =>
        "No before/after comparison, countdown timer, or superlative claim language appears anywhere on the creative.",
    },
    {
      summary: () =>
        "Text-to-image ratio stays well within Meta's guidance, so there's no obvious policy flag to fix before spend.",
      evidence: () =>
        "On-image text covers a small portion of the canvas, well within Meta's text-density guidance.",
    },
  ],
  legibility: [
    {
      summary: () =>
        "The headline holds up at thumbnail size — still readable once this scales down to a mobile feed.",
      evidence: () => "Headline text is set large enough to remain legible at thumbnail scale.",
    },
    {
      summary: () =>
        "Strong contrast between text and background keeps the message legible at a glance, not just in a full-size preview.",
      evidence: () => "Text and background sit at a high contrast ratio throughout the creative.",
    },
  ],
  brand_consistency: [
    {
      summary: (ctx) =>
        `Color palette and logo placement read as a coherent match for a ${ctx.industry || "brand"} creative — nothing here feels off-brand.`,
      evidence: () => "The color palette and logo placement match the brand's stated visual identity.",
    },
    {
      summary: () => "Tone of the on-image copy matches the brand description you gave — no jarring shift in voice.",
      evidence: () => "The on-image copy's tone matches the brand description provided.",
    },
  ],
  message_clarity: [
    {
      summary: (ctx) =>
        `The value proposition lands in the first line a viewer's eye hits, which is what a ${objectiveLabel(ctx.campaignObjective)} campaign needs.`,
      evidence: () => "The value proposition appears in the first line of headline text.",
    },
    {
      summary: () => "The call-to-action is unambiguous and points at one clear next step, not several competing ones.",
      evidence: () => "A single call-to-action button appears once, with no competing secondary CTA.",
    },
  ],
};

const WEAKNESS_TEMPLATES: Record<AnnotationCategory, FindingTemplate[]> = {
  policy_risk: [
    {
      summary: () =>
        "The overlay text is dense enough that Meta's review could flag it for excessive text-on-image — worth trimming before it goes live.",
      evidence: () => "On-image text covers roughly a third of the creative's total area.",
    },
    {
      summary: () => "The framing reads close to a before/after claim, which Meta ad review tends to scrutinize closely.",
      evidence: () => "The creative shows a side-by-side before/after comparison.",
    },
  ],
  legibility: [
    {
      summary: () => "Body copy sits at a size that's hard to read once this shrinks to a phone-sized feed card.",
      evidence: () => "Body copy is set below 14px relative to the creative's dimensions.",
    },
    {
      summary: () => "The CTA button blends into the background — it's easy to miss on a quick scroll.",
      evidence: () => "The CTA button's fill color is close in value to the background directly behind it.",
    },
  ],
  brand_consistency: [
    {
      summary: (ctx) =>
        `The visual tone skews more generic than what you described for ${ctx.brandName || "the brand"} — it could be swapped in for a competitor's ad without much change.`,
      evidence: () => "No brand-specific color, logo, or visual motif appears on the creative.",
    },
    {
      summary: () =>
        "Logo placement is small enough that brand recall is weaker than it needs to be for a cold-audience impression.",
      evidence: () => "The logo occupies less than 3% of the total image area.",
    },
  ],
  message_clarity: [
    {
      summary: (ctx) =>
        `It isn't obvious from the creative alone what action to take, which works against a ${objectiveLabel(ctx.campaignObjective)} goal.`,
      evidence: () => "No CTA button or link text appears anywhere on the creative.",
    },
    {
      summary: () =>
        "Too many messages compete for attention at once — headline, subhead, and badge all pull the eye in different directions.",
      evidence: () =>
        "Three separate text elements — headline, subhead, and badge — appear at similar visual weight.",
    },
  ],
};

const RECOMMENDATION_TEMPLATES: Record<AnnotationCategory, Template[]> = {
  policy_risk: [
    () => "Reduce the amount of overlay text and let the image itself carry more of the message.",
    () => "Reframe the before/after language so it reads as a benefit statement, not a comparison claim.",
  ],
  legibility: [
    () => "Increase the body copy size by at least a few points and re-check legibility at actual feed size.",
    () => "Give the CTA button a color that contrasts clearly against its background.",
  ],
  brand_consistency: [
    () => "Bring the brand's actual color palette and logo treatment more directly into the creative.",
    () => "Size the logo up slightly so it survives being seen for half a second in a feed.",
  ],
  message_clarity: [
    () => "Lead with a single, specific call-to-action and cut anything competing with it.",
    () => "Simplify to one primary message — pick the headline or the badge, not both.",
  ],
};

type CampaignSignal = {
  category: AnnotationCategory;
  strengthText: Template;
  strengthEvidence: Template;
  weaknessText: Template;
  weaknessEvidence: Template;
};

// Strategic-fit findings: how well the creative matches the expectations
// of its declared Campaign Type/Occasion (e.g. a Promotion creative is
// expected to show a price or offer; an Evergreen one shouldn't lean on
// fake urgency). Deliberately covers a representative subset of values,
// not every Campaign Type × Occasion combination — see DEVELOPMENT_PLAN.md.
// These findings never carry a boundingBox: they're about strategic fit,
// not a location on the image, so they never get a marker (UI_SPEC.md).
const CAMPAIGN_TYPE_SIGNALS: Partial<Record<CampaignType, CampaignSignal>> = {
  // Covers sales, discounts, limited-time offers, and holiday/seasonal
  // promotions — see PRODUCT_SPEC.md's Campaign Type taxonomy.
  promotion: {
    category: "message_clarity",
    strengthText: () =>
      "The price, discount, or offer is stated clearly, so there's no ambiguity about what's on the table or why to act now.",
    strengthEvidence: () =>
      "A specific price, percentage-off, or offer amount appears in the creative's headline area.",
    weaknessText: () =>
      "There's no visible price, discount, or offer callout — for a Promotion creative, that's usually the first thing a viewer looks for.",
    weaknessEvidence: () => "No price, percentage, or offer amount appears anywhere on the creative.",
  },
  product_launch: {
    category: "message_clarity",
    strengthText: () =>
      "What's new and different about this product comes through clearly, not just that it exists.",
    strengthEvidence: () =>
      "Copy explicitly names what's new about the product (e.g. \"Introducing\" or \"Now available\").",
    weaknessText: () =>
      "It's not clear what's new here versus an existing product — a launch creative needs to earn that distinction visually.",
    weaknessEvidence: () => "No copy distinguishes the product from a prior or existing version.",
  },
  evergreen: {
    category: "message_clarity",
    strengthText: () =>
      "The tone stays steady and confident without leaning on artificial urgency, which fits an always-on placement.",
    strengthEvidence: () => "No countdown timer or \"today only\" language appears in the copy.",
    weaknessText: () =>
      "Urgency language (\"today only\", countdown framing) sits oddly on an evergreen creative meant to run indefinitely.",
    weaknessEvidence: () => "Countdown or \"today only\" language appears despite no stated end date.",
  },
};

const OCCASION_SIGNALS: Partial<Record<Occasion, CampaignSignal>> = {
  black_friday: {
    category: "message_clarity",
    strengthText: () => "Urgency and the Black Friday offer are unmistakable at a glance.",
    strengthEvidence: () => "\"Black Friday\" or an equivalent seasonal callout appears in the creative's copy.",
    weaknessText: () =>
      "This doesn't read as a Black Friday creative — there's no urgency or event-specific offer visible.",
    weaknessEvidence: () =>
      "No seasonal or Black Friday–specific copy or imagery appears on the creative.",
  },
};

function buildCampaignSignalPoint(
  rng: Rng,
  ctx: CreativeContext,
  signal: CampaignSignal,
): { isStrength: boolean; point: AnnotatedPoint } {
  const isStrength = rng() > 0.5;
  return {
    isStrength,
    point: {
      id: crypto.randomUUID(),
      category: signal.category,
      summary: isStrength ? signal.strengthText(ctx) : signal.weaknessText(ctx),
      evidence: isStrength ? signal.strengthEvidence(ctx) : signal.weaknessEvidence(ctx),
    },
  };
}

function buildPoint(
  rng: Rng,
  category: AnnotationCategory,
  templates: Record<AnnotationCategory, FindingTemplate[]>,
  ctx: CreativeContext,
  withBox: boolean,
): AnnotatedPoint {
  const template = pick(rng, templates[category]);
  return {
    id: crypto.randomUUID(),
    category,
    summary: template.summary(ctx),
    evidence: template.evidence(ctx),
    boundingBox: withBox ? randomBoundingBox(rng) : undefined,
  };
}

// How rich/severe the fabricated findings for this report should be —
// drives finding counts and the blocking roll below, nothing else. This
// is NOT the report's verdict: per VERDICT_INTELLIGENCE_FRAMEWORK.md and
// decision-engine.ts, the verdict is always computed from the resulting
// findings (computeVerdict), never picked up front. Same thresholds and
// aspect-ratio branching as before this file's Milestone 025 integration
// — only the label changed, from a Verdict to this internal-only signal.
type SeverityRoll = "clean" | "mixed" | "severe";

function rollSeverity(rng: Rng, aspectRatio: number): SeverityRoll {
  // Extreme aspect ratios nudge toward "mixed" rather than flipping to
  // "severe" outright — per DEVELOPMENT_PLAN.md's mock-engine guidance.
  const isExtremeAspectRatio = aspectRatio < 0.35 || aspectRatio > 2.2;
  const roll = rng();

  if (isExtremeAspectRatio) {
    if (roll < 0.55) return "mixed";
    if (roll < 0.8) return "severe";
    return "clean";
  }

  if (roll < 0.45) return "clean";
  if (roll < 0.8) return "mixed";
  return "severe";
}

export const mockPerceptionEngine: PerceptionEngine = {
  async perceive(image: CreativeImage, context: CreativeContext): Promise<PerceptionResult> {
    const seed = hashString(
      `${context.brandName}|${context.website}|${context.industry}|${context.campaignObjective}|${context.campaignType}|${context.occasion ?? ""}|${context.targetAudience ?? ""}|${image.width}x${image.height}`,
    );
    const rng = mulberry32(seed);
    const aspectRatio = image.width / Math.max(image.height, 1);
    const severity = rollSeverity(rng, aspectRatio);

    const strengthCount = severity === "severe" ? randomInt(rng, 1, 2) : randomInt(rng, 2, 3);
    const weaknessCount =
      severity === "clean" ? randomInt(rng, 0, 1) : severity === "mixed" ? randomInt(rng, 1, 3) : randomInt(rng, 2, 4);

    const strengths: AnnotatedPoint[] = Array.from({ length: strengthCount }, () =>
      buildPoint(rng, pick(rng, CATEGORIES), STRENGTH_TEMPLATES, context, rng() > 0.4),
    );

    const weaknesses: Weakness[] = Array.from({ length: weaknessCount }, (_, index) => {
      const point = buildPoint(rng, pick(rng, CATEGORIES), WEAKNESS_TEMPLATES, context, rng() > 0.3);
      const blocking = severity === "severe" ? index === 0 || rng() > 0.6 : false;
      return { ...point, blocking };
    });

    // Strategic-fit findings from the declared Campaign Type/Occasion, on
    // top of the category-based findings above.
    const campaignSignals = [
      CAMPAIGN_TYPE_SIGNALS[context.campaignType],
      context.occasion ? OCCASION_SIGNALS[context.occasion] : undefined,
    ].filter((signal): signal is CampaignSignal => signal !== undefined);

    for (const signal of campaignSignals) {
      const { isStrength, point } = buildCampaignSignalPoint(rng, context, signal);
      if (isStrength) {
        strengths.push(point);
      } else {
        weaknesses.push({ ...point, blocking: false });
      }
    }

    // Recommendations are keyed off each weakness's category, which
    // validation.ts never changes — computing them here, ahead of
    // validation, produces the exact same output the orchestrator would
    // get computing them afterward, without this layer needing to know
    // validation exists.
    const recommendations = weaknesses.map(
      (weakness) => pick(rng, RECOMMENDATION_TEMPLATES[weakness.category])(context),
    );
    if (recommendations.length === 0) {
      recommendations.push(
        "No critical issues here — consider a lightweight A/B test against a different headline to see if performance improves further.",
      );
    }

    return { strengths, weaknesses, recommendations };
  },
};
