import type {
  AnnotatedPoint,
  AnnotationCategory,
  BoundingBox,
  CampaignObjective,
  CreativeContext,
  CreativeImage,
  Verdict,
  VerdictEngine,
  VerdictReport,
  Weakness,
} from "./types";

const CATEGORIES: AnnotationCategory[] = [
  "policy_risk",
  "legibility",
  "brand_consistency",
  "message_clarity",
];

type Rng = () => number;
type Template = (ctx: CreativeContext) => string;

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
// sounding, confident — not generic best-practices filler.
const STRENGTH_TEMPLATES: Record<AnnotationCategory, Template[]> = {
  policy_risk: [
    () =>
      "No prohibited claims language or misleading before/after framing — this reads as compliant with Meta's policy on the first pass.",
    () =>
      "Text-to-image ratio stays well within Meta's guidance, so there's no obvious policy flag to fix before spend.",
  ],
  legibility: [
    () =>
      "The headline holds up at thumbnail size — still readable once this scales down to a mobile feed.",
    () =>
      "Strong contrast between text and background keeps the message legible at a glance, not just in a full-size preview.",
  ],
  brand_consistency: [
    (ctx) =>
      `Color palette and logo placement read as a coherent match for a ${ctx.industry || "brand"} creative — nothing here feels off-brand.`,
    () => "Tone of the on-image copy matches the brand description you gave — no jarring shift in voice.",
  ],
  message_clarity: [
    (ctx) =>
      `The value proposition lands in the first line a viewer's eye hits, which is what a ${objectiveLabel(ctx.campaignObjective)} campaign needs.`,
    () => "The call-to-action is unambiguous and points at one clear next step, not several competing ones.",
  ],
};

const WEAKNESS_TEMPLATES: Record<AnnotationCategory, Template[]> = {
  policy_risk: [
    () =>
      "The overlay text is dense enough that Meta's review could flag it for excessive text-on-image — worth trimming before it goes live.",
    () => "The framing reads close to a before/after claim, which Meta ad review tends to scrutinize closely.",
  ],
  legibility: [
    () => "Body copy sits at a size that's hard to read once this shrinks to a phone-sized feed card.",
    () => "The CTA button blends into the background — it's easy to miss on a quick scroll.",
  ],
  brand_consistency: [
    (ctx) =>
      `The visual tone skews more generic than what you described for ${ctx.brandName || "the brand"} — it could be swapped in for a competitor's ad without much change.`,
    () => "Logo placement is small enough that brand recall is weaker than it needs to be for a cold-audience impression.",
  ],
  message_clarity: [
    (ctx) =>
      `It isn't obvious from the creative alone what action to take, which works against a ${objectiveLabel(ctx.campaignObjective)} goal.`,
    () => "Too many messages compete for attention at once — headline, subhead, and badge all pull the eye in different directions.",
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

function buildPoint(
  rng: Rng,
  category: AnnotationCategory,
  templates: Record<AnnotationCategory, Template[]>,
  ctx: CreativeContext,
  withBox: boolean,
): AnnotatedPoint {
  return {
    id: crypto.randomUUID(),
    category,
    summary: pick(rng, templates[category])(ctx),
    boundingBox: withBox ? randomBoundingBox(rng) : undefined,
  };
}

function determineVerdict(rng: Rng, aspectRatio: number): Verdict {
  // Extreme aspect ratios nudge toward "test" rather than flipping the
  // verdict outright — per DEVELOPMENT_PLAN.md's mock-engine guidance.
  const isExtremeAspectRatio = aspectRatio < 0.35 || aspectRatio > 2.2;
  const roll = rng();

  if (isExtremeAspectRatio) {
    if (roll < 0.55) return "test";
    if (roll < 0.8) return "dont_launch";
    return "launch";
  }

  if (roll < 0.45) return "launch";
  if (roll < 0.8) return "test";
  return "dont_launch";
}

function confidenceRange(verdict: Verdict): [number, number] {
  switch (verdict) {
    case "launch":
      return [78, 96];
    case "test":
      return [55, 80];
    case "dont_launch":
      return [60, 92];
  }
}

function buildExecutiveSummary(
  ctx: CreativeContext,
  verdict: Verdict,
  topStrength: AnnotatedPoint | undefined,
  topWeakness: Weakness | undefined,
): string {
  const brand = ctx.brandName || "This creative";
  switch (verdict) {
    case "launch":
      return `${brand} is ready to spend against. ${topStrength ? topStrength.summary : "The core message and layout both hold up."} No blocking issues found for a ${objectiveLabel(ctx.campaignObjective)} campaign.`;
    case "test":
      return `${brand} is workable but not a clean launch yet. ${topWeakness ? topWeakness.summary : "There are a couple of open questions worth resolving first."} Worth an A/B test or a second look before committing full budget.`;
    case "dont_launch":
      return `${brand} shouldn't go live as-is. ${topWeakness ? topWeakness.summary : "There's a blocking issue that likely wastes spend if this runs today."} Fix the flagged issue before this reaches a real audience.`;
  }
}

export const mockVerdictEngine: VerdictEngine = {
  async analyze(image: CreativeImage, context: CreativeContext): Promise<VerdictReport> {
    const seed = hashString(
      `${context.brandName}|${context.website}|${context.industry}|${context.campaignObjective}|${context.targetAudience ?? ""}|${image.width}x${image.height}`,
    );
    const rng = mulberry32(seed);
    const aspectRatio = image.width / Math.max(image.height, 1);
    const verdict = determineVerdict(rng, aspectRatio);

    const [confidenceMin, confidenceMax] = confidenceRange(verdict);
    let confidence = randomInt(rng, confidenceMin, confidenceMax);
    if (!context.targetAudience) {
      confidence = Math.max(30, confidence - randomInt(rng, 4, 9));
    }

    const strengthCount = verdict === "dont_launch" ? randomInt(rng, 1, 2) : randomInt(rng, 2, 3);
    const weaknessCount =
      verdict === "launch" ? randomInt(rng, 0, 1) : verdict === "test" ? randomInt(rng, 1, 3) : randomInt(rng, 2, 4);

    const strengths: AnnotatedPoint[] = Array.from({ length: strengthCount }, () =>
      buildPoint(rng, pick(rng, CATEGORIES), STRENGTH_TEMPLATES, context, rng() > 0.4),
    );

    const weaknesses: Weakness[] = Array.from({ length: weaknessCount }, (_, index) => {
      const point = buildPoint(rng, pick(rng, CATEGORIES), WEAKNESS_TEMPLATES, context, rng() > 0.3);
      const blocking = verdict === "dont_launch" ? index === 0 || rng() > 0.6 : false;
      return { ...point, blocking };
    });

    const recommendations = weaknesses.map((weakness) => pick(rng, RECOMMENDATION_TEMPLATES[weakness.category])(context));
    if (recommendations.length === 0) {
      recommendations.push(
        "Nothing blocking here — consider a lightweight A/B test against a different headline to see if performance improves further.",
      );
    }

    return {
      verdict,
      confidence: Math.min(99, Math.max(1, confidence)),
      executiveSummary: buildExecutiveSummary(context, verdict, strengths[0], weaknesses[0]),
      strengths,
      weaknesses,
      recommendations,
    };
  },
};
