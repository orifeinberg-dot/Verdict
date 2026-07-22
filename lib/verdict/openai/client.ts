import type { OpenAIPerceptionResponse, PERCEPTION_RESPONSE_JSON_SCHEMA } from "./schema";

/**
 * The one place that will know about the OpenAI SDK once it's installed.
 * `openai-perception.ts` depends only on this interface — never on SDK
 * types, request/response objects, or client configuration — so wiring up
 * a real SDK later means changing only this file's implementation.
 */

/**
 * Everything the client needs to perform one creative analysis call,
 * expressed in plain, SDK-agnostic terms: the already-built prompt text,
 * an opaque image payload (shape TBD — see `openai-perception.ts`'s
 * `prepareImagePayload`), and the structured-output schema the response
 * must conform to. No SDK-specific request object is exposed here.
 */
export interface AnalyzeCreativeRequest {
  prompt: string;
  imagePayload: unknown;
  responseSchema: typeof PERCEPTION_RESPONSE_JSON_SCHEMA;
}

export interface OpenAIClient {
  analyzeCreative(request: AnalyzeCreativeRequest): Promise<OpenAIPerceptionResponse>;
}

/**
 * Deliberately unimplemented. No SDK is imported, no network request is
 * made — this throws rather than returning a fabricated response so a
 * caller can never mistake "not built yet" for "the model found nothing."
 */
export const openAIClient: OpenAIClient = {
  async analyzeCreative(request: AnalyzeCreativeRequest): Promise<OpenAIPerceptionResponse> {
    void request;
    throw new Error("OpenAI client has not been implemented.");
  },
};
