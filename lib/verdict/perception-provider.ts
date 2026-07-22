import type { PerceptionEngine } from "./perception";
import { mockPerceptionEngine } from "./mock-perception";

/**
 * The single place a perception implementation is chosen. Callers depend
 * only on the returned `PerceptionEngine` — never on a concrete provider
 * (mock, OpenAI Vision, Claude Vision, Gemini Vision, etc.) — so adding a
 * provider later means changing the selection here, not at every call
 * site.
 */
export function getPerceptionEngine(): PerceptionEngine {
  return mockPerceptionEngine;
}
