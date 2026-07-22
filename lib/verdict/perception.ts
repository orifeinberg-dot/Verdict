import type { AnnotatedPoint, CreativeContext, CreativeImage, Weakness } from "./types";

/**
 * The result of perceiving a creative: raw observations only. It carries
 * no verdict, confidence, or executive summary — those are computed
 * downstream by decision-engine.ts from validated findings, never by the
 * perception layer itself.
 */
export interface PerceptionResult {
  strengths: AnnotatedPoint[];
  weaknesses: Weakness[];
  recommendations: string[];
}

/**
 * The contract every perception provider (mock, OpenAI, Claude, Gemini,
 * etc.) must satisfy. Perceiving is the only responsibility here — the
 * findings a provider returns are not yet validated (see validation.ts)
 * and are not assumed safe for the decision engine to trust at face
 * value.
 */
export interface PerceptionEngine {
  perceive(image: CreativeImage, context: CreativeContext): Promise<PerceptionResult>;
}
