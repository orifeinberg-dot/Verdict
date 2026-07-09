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

export type CreativeContext = {
  brandName: string;
  website: string;
  industry: string;
  campaignObjective: CampaignObjective;
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
