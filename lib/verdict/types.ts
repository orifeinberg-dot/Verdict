export type Verdict = "launch" | "test" | "dont_launch";

export type AnnotationCategory =
  | "policy_risk"
  | "legibility"
  | "brand_consistency"
  | "message_clarity";

// Percentages of image width/height, per UI_SPEC.md's "Visual annotation
// design" — approximate, not pixel-perfect, and resolution-independent.
export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AnnotatedPoint = {
  id: string;
  category: AnnotationCategory;
  summary: string;
  // The concrete, observable fact backing `summary` (e.g. "The CTA button
  // is positioned below the fold.") — never a recommendation or
  // conclusion. Required and must be non-empty. See
  // VERDICT_INTELLIGENCE_FRAMEWORK.md's AI Contract.
  evidence: string;
  boundingBox?: BoundingBox;
};

// `blocking` is an internal flag the engine uses to reason about whether a
// weakness alone justifies "Don't Launch" — it's not a UI severity tier.
export type Weakness = AnnotatedPoint & { blocking: boolean };

export type VerdictReport = {
  verdict: Verdict;
  confidence: number; // 0-100
  executiveSummary: string;
  strengths: AnnotatedPoint[];
  weaknesses: Weakness[];
  // Plain actions, never annotated on the image — see UI_SPEC.md.
  recommendations: string[];
};

export type CampaignObjective =
  | "awareness"
  | "traffic"
  | "conversions"
  | "app_installs";

export type CampaignType =
  | "evergreen"
  | "promotion"
  | "product_launch"
  | "retargeting"
  | "brand_awareness"
  | "other";

// Retired Campaign Type values from before the taxonomy simplification —
// see agents/prompts/020-report-language-and-taxonomy-cleanup.md. "sale",
// "holiday", and "seasonal" now fold into "promotion" (with Occasion
// carrying the specific event); these are kept only so legacy
// sessionStorage reports can still load and render, never offered as a
// choice for new submissions.
export type LegacyCampaignType = "sale" | "holiday" | "seasonal";

// The set of campaignType values a *stored* report may legitimately
// contain — current options plus retired ones from before this
// simplification. New submissions are always CampaignType; this wider
// type exists only for reading back old sessionStorage entries.
export type StoredCampaignType = CampaignType | LegacyCampaignType;

// Only meaningful for a subset of CampaignType values — see
// PRODUCT_SPEC.md's "Occasion" and UI_SPEC.md for the conditional
// show/hide rule. Optional even when the field is shown; "none" is the
// default, not a placeholder state.
export type Occasion =
  | "none"
  | "black_friday"
  | "cyber_monday"
  | "christmas"
  | "valentines_day"
  | "mothers_day"
  | "fathers_day"
  | "back_to_school"
  | "new_year"
  | "summer_sale"
  | "spring_sale"
  | "other";

export type CreativeContext = {
  brandName: string;
  website: string;
  industry: string;
  // Meta's funnel/optimization goal — distinct from campaignType below.
  campaignObjective: CampaignObjective;
  // The strategic/content category the creative belongs to — see
  // PRODUCT_SPEC.md's "Campaign objective vs. Campaign Type".
  campaignType: CampaignType;
  occasion?: Occasion;
  targetAudience?: string;
};

export type CreativeImage = {
  dataUrl: string;
  width: number;
  height: number;
};

export interface VerdictEngine {
  analyze(
    image: CreativeImage,
    context: CreativeContext,
  ): Promise<VerdictReport>;
}
