import type { VerdictEngine } from "./types";
import { mockVerdictEngine } from "./mock-engine";

// The OpenAI phase adds a `VERDICT_ENGINE=openai` branch here, selecting an
// `openaiEngine` implementation of the same interface. Until that file
// exists, there's nothing to branch on.
export const verdictEngine: VerdictEngine = mockVerdictEngine;
