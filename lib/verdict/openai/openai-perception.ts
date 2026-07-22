import type { CreativeContext, CreativeImage } from "../types";
import type { PerceptionEngine, PerceptionResult } from "../perception";
import { buildPerceptionPrompt } from "./prompt";
import { mapOpenAIResponse } from "./mapper";
import type { OpenAIPerceptionResponse } from "./schema";

/**
 * The first concrete `PerceptionEngine` implementation for OpenAI Vision —
 * intentionally inert. It exists to give the future integration a runtime
 * shape (`build prompt → prepare image → call provider → map response →
 * PerceptionResult`) before any of that pipeline can actually run. No SDK
 * is installed, no network request is made, and no environment variable
 * is read here — this module is offline by construction.
 *
 * This is also the *only* module allowed to import `./prompt`, `./schema`,
 * and `./mapper` (aside from those files' own unit tests). Every other
 * layer — `perception-provider.ts`, the orchestrator, the UI — depends
 * only on the `PerceptionEngine` interface, never on OpenAI-specific
 * pieces directly. Keeping that import boundary here is what will let a
 * real implementation land later by changing only this file's body.
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

/**
 * Stands in for the actual OpenAI API call. Deliberately unimplemented:
 * throws rather than returning a fabricated or empty response, so a
 * caller can never mistake "not built yet" for "the model found nothing."
 */
async function callOpenAIVisionProvider(prompt: string, imagePayload: unknown): Promise<OpenAIPerceptionResponse> {
  void prompt;
  void imagePayload;
  throw new Error(
    "openAIPerceptionEngine: the OpenAI provider call is not yet implemented. " +
      "getPerceptionEngine() (see ../perception-provider.ts) still returns mockPerceptionEngine; " +
      "this engine is not referenced anywhere in the running application.",
  );
}

export const openAIPerceptionEngine: PerceptionEngine = {
  async perceive(image: CreativeImage, context: CreativeContext): Promise<PerceptionResult> {
    const prompt = buildPerceptionPrompt(context);
    const imagePayload = prepareImagePayload(image);
    const response = await callOpenAIVisionProvider(prompt, imagePayload);
    return mapOpenAIResponse(response);
  },
};
