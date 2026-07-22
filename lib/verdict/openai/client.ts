import OpenAI from "openai";
import { resolveOpenAIConfig, type OpenAIConfig } from "./config";
import type { OpenAIPerceptionResponse, PERCEPTION_RESPONSE_JSON_SCHEMA, RawFinding, RawWeakness } from "./schema";

/**
 * The one place that knows about the OpenAI SDK. `openai-perception.ts`
 * depends only on `OpenAIClient` — never on SDK types, request/response
 * objects, or client configuration — so this file is the sole boundary
 * between Verdict's application code and the `openai` package.
 *
 * Scope — this module owns: lazy SDK construction, translating a Verdict
 * request into an SDK request, making the provider request, extracting
 * output text, parsing JSON, and validating the raw provider-response
 * shape. It does NOT own: prompt composition, image conversion from
 * browser files, category narrowing, ID generation, business validation,
 * verdict calculation, provider selection, or UI error presentation —
 * those remain `prompt.ts`, `mapper.ts`, `validation.ts`,
 * `decision-engine.ts`, and `perception-provider.ts`'s jobs respectively.
 */

/**
 * The smallest SDK-agnostic representation of an image the Responses API
 * accepts: a data URL or an externally accessible image URL. No SDK image
 * type is exposed through the public request contract.
 */
export interface OpenAIImagePayload {
  imageUrl: string;
}

/**
 * Everything the client needs to perform one creative analysis call,
 * expressed in plain, SDK-agnostic terms. No SDK-specific request object
 * is exposed here.
 */
export interface AnalyzeCreativeRequest {
  prompt: string;
  imagePayload: OpenAIImagePayload;
  responseSchema: typeof PERCEPTION_RESPONSE_JSON_SCHEMA;
}

export interface OpenAIClient {
  analyzeCreative(request: AnalyzeCreativeRequest): Promise<OpenAIPerceptionResponse>;
}

type OpenAIResponseCreateParams = OpenAI.Responses.ResponseCreateParamsNonStreaming;

/**
 * The minimal slice of the SDK's surface this client actually calls —
 * deliberately narrowed to just the one field this module reads
 * (`output_text`) rather than the SDK's full `Response` type. Depending
 * on this narrow interface, instead of the full `OpenAI` class, is what
 * lets tests inject a fake transport without touching the real SDK or
 * the network; a real `OpenAI` instance's `responses.create(...)`
 * (which returns the full `Response`, a superset of this) satisfies it
 * structurally.
 */
export interface OpenAIResponsesTransport {
  responses: {
    create(body: OpenAIResponseCreateParams): Promise<{ output_text: string }>;
  };
}

/** A deterministic, application-owned failure distinguishing "the provider replied, but we couldn't trust the reply" from SDK-level failures (auth, rate limit, timeout, etc.), which are never wrapped in this. */
export class OpenAIProviderResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIProviderResponseError";
  }
}

const PERCEPTION_SCHEMA_NAME = "verdict_perception";

function buildResponseCreateParams(request: AnalyzeCreativeRequest, config: OpenAIConfig): OpenAIResponseCreateParams {
  return {
    model: config.model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: request.prompt },
          // "auto" is the fixed default for the SDK's required `detail`
          // field — not a new configuration surface (see the milestone's
          // "do not add image detail settings" scope note); the field is
          // required by this SDK version's `ResponseInputImage` type, so
          // some value must be supplied.
          { type: "input_image", image_url: request.imagePayload.imageUrl, detail: "auto" },
        ],
      },
    ],
    max_output_tokens: config.maxOutputTokens,
    text: {
      format: {
        type: "json_schema",
        name: PERCEPTION_SCHEMA_NAME,
        schema: request.responseSchema,
        strict: true,
      },
    },
  };
}

function extractOutputText(response: { output_text: string }): string {
  const outputText = response.output_text;
  if (typeof outputText !== "string" || outputText.trim() === "") {
    throw new OpenAIProviderResponseError("OpenAI response contained no output text.");
  }
  return outputText;
}

function parseJson(outputText: string): unknown {
  try {
    return JSON.parse(outputText);
  } catch {
    throw new OpenAIProviderResponseError("OpenAI response output text was not valid JSON.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Structural validation only — confirms the raw JSON has the shape
 * `OpenAIPerceptionResponse` requires. Deliberately does not narrow
 * `category` into `AnnotationCategory`, enforce `blocking` eligibility,
 * assign IDs, or touch recommendation order; those remain `mapper.ts`
 * and the deterministic pipeline's jobs (see this file's module doc).
 */
function assertValidBoundingBox(value: unknown, path: string): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value)) {
    throw new OpenAIProviderResponseError(`OpenAI response ${path}.boundingBox must be an object when present.`);
  }
  for (const key of ["x", "y", "width", "height"] as const) {
    if (!isFiniteNumber(value[key])) {
      throw new OpenAIProviderResponseError(`OpenAI response ${path}.boundingBox.${key} must be a finite number.`);
    }
  }
}

function assertValidFinding(value: unknown, path: string): asserts value is RawFinding {
  if (!isRecord(value)) {
    throw new OpenAIProviderResponseError(`OpenAI response ${path} must be an object.`);
  }
  if (typeof value.category !== "string") {
    throw new OpenAIProviderResponseError(`OpenAI response ${path}.category must be a string.`);
  }
  if (typeof value.summary !== "string") {
    throw new OpenAIProviderResponseError(`OpenAI response ${path}.summary must be a string.`);
  }
  if (typeof value.evidence !== "string") {
    throw new OpenAIProviderResponseError(`OpenAI response ${path}.evidence must be a string.`);
  }
  assertValidBoundingBox(value.boundingBox, path);
}

function assertValidWeakness(value: unknown, path: string): asserts value is RawWeakness {
  if (!isRecord(value)) {
    throw new OpenAIProviderResponseError(`OpenAI response ${path} must be an object.`);
  }
  if (typeof value.blocking !== "boolean") {
    throw new OpenAIProviderResponseError(`OpenAI response ${path}.blocking must be a boolean.`);
  }
  assertValidFinding(value, path);
}

function assertValidOpenAIPerceptionResponse(value: unknown): asserts value is OpenAIPerceptionResponse {
  if (!isRecord(value)) {
    throw new OpenAIProviderResponseError("OpenAI response body must be a JSON object.");
  }
  if (!Array.isArray(value.strengths)) {
    throw new OpenAIProviderResponseError("OpenAI response `strengths` must be an array.");
  }
  if (!Array.isArray(value.weaknesses)) {
    throw new OpenAIProviderResponseError("OpenAI response `weaknesses` must be an array.");
  }
  if (!Array.isArray(value.recommendations)) {
    throw new OpenAIProviderResponseError("OpenAI response `recommendations` must be an array.");
  }
  value.strengths.forEach((finding, index) => assertValidFinding(finding, `strengths[${index}]`));
  value.weaknesses.forEach((weakness, index) => assertValidWeakness(weakness, `weaknesses[${index}]`));
  value.recommendations.forEach((recommendation, index) => {
    if (typeof recommendation !== "string") {
      throw new OpenAIProviderResponseError(`OpenAI response recommendations[${index}] must be a string.`);
    }
  });
}

/**
 * The default, real transport: a lazily-constructed `OpenAI` SDK client.
 * Never called at module-import time — only when `analyzeCreative` is
 * actually invoked (see `createOpenAIClient` below) — so importing this
 * module requires no environment variables and makes no network request.
 * Exported so tests can verify SDK construction receives the right
 * configuration without needing to invoke a real client end to end.
 */
export function createDefaultOpenAITransport(config: OpenAIConfig): OpenAIResponsesTransport {
  return new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMs,
    maxRetries: config.maxRetries,
  });
}

/**
 * Creates an `OpenAIClient`. Both dependencies default to the real,
 * lazy implementations (`resolveOpenAIConfig`, `createDefaultOpenAITransport`)
 * — this factory exists so tests can inject a fake config resolver and/or
 * transport, the smallest seam needed to test `analyzeCreative`'s
 * behavior without network access or real environment variables. Neither
 * dependency is invoked until `analyzeCreative` is called.
 */
export function createOpenAIClient(
  dependencies: {
    resolveConfig?: () => OpenAIConfig;
    createTransport?: (config: OpenAIConfig) => OpenAIResponsesTransport;
  } = {},
): OpenAIClient {
  const resolveConfig = dependencies.resolveConfig ?? resolveOpenAIConfig;
  const createTransport = dependencies.createTransport ?? createDefaultOpenAITransport;

  return {
    async analyzeCreative(request: AnalyzeCreativeRequest): Promise<OpenAIPerceptionResponse> {
      const config = resolveConfig();
      const transport = createTransport(config);
      const params = buildResponseCreateParams(request, config);

      // Not wrapped in try/catch: SDK errors (authentication, rate-limit,
      // timeout, server errors) propagate with their original identity —
      // only the application-owned steps below throw
      // `OpenAIProviderResponseError`.
      const response = await transport.responses.create(params);

      const outputText = extractOutputText(response);
      const parsed = parseJson(outputText);
      assertValidOpenAIPerceptionResponse(parsed);
      return parsed;
    },
  };
}

/**
 * The application-facing singleton. Constructing it here is cheap and
 * side-effect free — it only builds a closure; no configuration is
 * resolved and no SDK client is constructed until `analyzeCreative` is
 * actually called.
 */
export const openAIClient: OpenAIClient = createOpenAIClient();
