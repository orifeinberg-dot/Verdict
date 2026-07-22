import type { CreativeContext, CreativeImage } from "../types";
import type { PerceptionEngine, PerceptionResult } from "../perception";
import { buildPerceptionPrompt } from "./prompt";
import { mapOpenAIResponse } from "./mapper";
import { PERCEPTION_RESPONSE_JSON_SCHEMA } from "./schema";
import { openAIClient, type OpenAIImagePayload } from "./client";

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
 * Placeholder only. Once a real image-conversion pipeline exists, this
 * will convert `CreativeImage` into an `OpenAIImagePayload` (a data URL
 * or externally accessible image URL — see `./client.ts`). Converting a
 * browser-captured image into that shape is out of scope for this
 * milestone, so this throws rather than fabricating a value that would
 * misrepresent readiness; `openAIPerceptionEngine` remains inert and
 * unreferenced by the running application either way.
 */
function prepareImagePayload(image: CreativeImage): OpenAIImagePayload {
  void image;
  throw new Error(
    "openAIPerceptionEngine: converting a CreativeImage into an OpenAIImagePayload is not yet implemented.",
  );
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
