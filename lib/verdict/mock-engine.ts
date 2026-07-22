import type { AnnotationCategory, CreativeContext, CreativeImage, VerdictEngine, VerdictReport } from "./types";
import { assembleExecutiveSummary, computeConfidence, computeVerdict, selectAnchorFinding } from "./decision-engine";
import { validateWeaknesses } from "./validation";
import { getPerceptionEngine } from "./perception-provider";

// The mock perception engine always evaluates all four dimensions — this
// is the coveredDimensions signal computeConfidence needs, not a fact the
// PerceptionResult contract carries itself (see perception.ts).
const CATEGORIES: AnnotationCategory[] = [
  "policy_risk",
  "legibility",
  "brand_consistency",
  "message_clarity",
];

export const mockVerdictEngine: VerdictEngine = {
  async analyze(image: CreativeImage, context: CreativeContext): Promise<VerdictReport> {
    const { strengths, weaknesses, recommendations } = await getPerceptionEngine().perceive(image, context);

    const validatedWeaknesses = validateWeaknesses(weaknesses);

    const verdict = computeVerdict(validatedWeaknesses);
    const confidence = computeConfidence(strengths, validatedWeaknesses, CATEGORIES);
    const anchor = selectAnchorFinding(verdict, strengths, validatedWeaknesses);
    const executiveSummary = assembleExecutiveSummary(verdict, anchor, context);

    return {
      verdict,
      confidence,
      executiveSummary,
      strengths,
      weaknesses: validatedWeaknesses,
      recommendations,
    };
  },
};
