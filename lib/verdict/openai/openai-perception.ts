import type { CreativeContext, CreativeImage } from "../types";
import type { PerceptionEngine, PerceptionResult } from "../perception";
import { buildPerceptionPrompt } from "./prompt";
import { mapOpenAIResponse } from "./mapper";
import { PERCEPTION_RESPONSE_JSON_SCHEMA } from "./schema";
import { openAIClient } from "./client";

/**
 * The first concrete `PerceptionEngine` implementation for OpenAI Vision —
 * intentionally inert. It exists to give the future integration a runtime
 * shape (`build prompt → prepare image → openAIClient.analyzeCreative →
 * map response → PerceptionResult`) before any of that pipeline can
 * actually run. No SDK is installed, no network request is made, and no
 * environment variable is read here — this module is offline by
 * construction, and stays that way because `./client.ts` (not this file)
 * is where SDK-specific communication will eventually live.
 *
 * This is also the *only* module outside this OpenAI subsystem that
 * should ever need `./prompt`, `./schema`, and `./mapper` — `./client.ts`
 * knowing about `./schema`'s response shape is expected, since it's part
 * of the same subsystem, not a different layer (aside from these files'
 * own unit tests). Every other layer — `perception-provider.ts`, the
 * orchestrator, the UI — depends only on the `PerceptionEngine` interface,
 * never on OpenAI-specific pieces directly.
 */

/**
 * Placeholder only. Once a real OpenAI Vision call exists, this will
 * convert `CreativeImage` into whatever multimodal message-content shape
 * the API expects (e.g. a base64 image content part). Not implemented —
 * nothing downstream reads its return value yet.
 */
function prepareImagePayload(image: CreativeImage): unknown {
  void image;
  return undefined;
}

export const openAIPerceptionEngine: PerceptionEngine = {
  async perceive(image: CreativeImage, context: CreativeContext): Promise<PerceptionResult> {
    const prompt = buildPerceptionPrompt(context);
    const imagePayload = prepareImagePayload(image);
    const response = await openAIClient.analyzeCreative({
      prompt,
      imagePayload,
      responseSchema: PERCEPTION_RESPONSE_JSON_SCHEMA,
    });
    return mapOpenAIResponse(response);
  },
};
