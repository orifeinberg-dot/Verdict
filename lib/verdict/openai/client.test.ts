import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenAIConfig } from "./config";
import { PERCEPTION_RESPONSE_JSON_SCHEMA } from "./schema";
import type { AnalyzeCreativeRequest, OpenAIResponsesTransport } from "./client";

const SECRET_API_KEY = "sk-SECRET-DO-NOT-LEAK-12345";
const SECRET_PROMPT_MARKER = "SECRET_PROMPT_MARKER_XYZ";
const SECRET_IMAGE_MARKER = "data:image/png;base64,SECRET_IMAGE_MARKER_XYZ";

const FAKE_CONFIG: OpenAIConfig = {
  apiKey: SECRET_API_KEY,
  model: "gpt-test-model",
  timeoutMs: 12_345,
  maxRetries: 4,
  maxOutputTokens: 999,
};

const FAKE_REQUEST: AnalyzeCreativeRequest = {
  prompt: SECRET_PROMPT_MARKER,
  imagePayload: { imageUrl: SECRET_IMAGE_MARKER },
  responseSchema: PERCEPTION_RESPONSE_JSON_SCHEMA,
};

function fakeTransport(create: OpenAIResponsesTransport["responses"]["create"]): OpenAIResponsesTransport {
  return { responses: { create } };
}

function validResponseBody(overrides: Record<string, unknown> = {}) {
  return {
    strengths: [{ category: "policy_risk", summary: "Clean.", evidence: "No claims." }],
    weaknesses: [{ category: "legibility", summary: "Small text.", evidence: "12px body copy.", blocking: false }],
    recommendations: ["Increase body copy size."],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("importing client.ts", () => {
  it("does not resolve configuration merely by importing the module", async () => {
    const resolveConfigSpy = vi.fn();
    vi.doMock("./config", () => ({ resolveOpenAIConfig: resolveConfigSpy }));

    await import("./client");

    expect(resolveConfigSpy).not.toHaveBeenCalled();
  });

  it("does not instantiate the SDK merely by importing the module", async () => {
    const OpenAIConstructorSpy = vi.fn();
    vi.doMock("openai", () => ({ default: OpenAIConstructorSpy }));

    await import("./client");

    expect(OpenAIConstructorSpy).not.toHaveBeenCalled();
  });
});

describe("createOpenAIClient — request construction", () => {
  it("constructs a valid request: model, text prompt, image input, strict JSON Schema output, and max output tokens", async () => {
    const { createOpenAIClient } = await import("./client");
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify(validResponseBody()) });
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(create),
    });

    await client.analyzeCreative(FAKE_REQUEST);

    expect(create).toHaveBeenCalledTimes(1);
    const body = create.mock.calls[0][0];

    expect(body.model).toBe(FAKE_CONFIG.model);
    expect(body.max_output_tokens).toBe(FAKE_CONFIG.maxOutputTokens);

    const [message] = body.input;
    expect(message.role).toBe("user");
    const textPart = message.content.find((part: { type: string }) => part.type === "input_text");
    const imagePart = message.content.find((part: { type: string }) => part.type === "input_image");
    expect(textPart.text).toBe(SECRET_PROMPT_MARKER);
    expect(imagePart.image_url).toBe(SECRET_IMAGE_MARKER);

    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.name).toBe("verdict_perception");
    expect(body.text.format.schema).toBe(PERCEPTION_RESPONSE_JSON_SCHEMA);
    expect(body.text.format.strict).toBe(true);
  });
});

describe("createDefaultOpenAITransport — SDK construction", () => {
  it("constructs the SDK with apiKey, timeout, and maxRetries from config", async () => {
    const OpenAIConstructorSpy = vi.fn().mockImplementation(function FakeOpenAI() {
      return { responses: { create: vi.fn() } };
    });
    vi.doMock("openai", () => ({ default: OpenAIConstructorSpy }));

    const { createDefaultOpenAITransport } = await import("./client");
    createDefaultOpenAITransport(FAKE_CONFIG);

    expect(OpenAIConstructorSpy).toHaveBeenCalledTimes(1);
    expect(OpenAIConstructorSpy).toHaveBeenCalledWith({
      apiKey: FAKE_CONFIG.apiKey,
      timeout: FAKE_CONFIG.timeoutMs,
      maxRetries: FAKE_CONFIG.maxRetries,
    });
  });
});

describe("createOpenAIClient — response handling", () => {
  it("parses and returns a valid structured response", async () => {
    const { createOpenAIClient } = await import("./client");
    const body = validResponseBody();
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(vi.fn().mockResolvedValue({ output_text: JSON.stringify(body) })),
    });

    const result = await client.analyzeCreative(FAKE_REQUEST);

    expect(result).toEqual(body);
  });

  it("preserves recommendation order and duplicates exactly", async () => {
    const { createOpenAIClient } = await import("./client");
    const recommendations = ["Third.", "First.", "First.", "Second."];
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () =>
        fakeTransport(vi.fn().mockResolvedValue({ output_text: JSON.stringify(validResponseBody({ recommendations })) })),
    });

    const result = await client.analyzeCreative(FAKE_REQUEST);

    expect(result.recommendations).toEqual(recommendations);
  });

  it("throws a deterministic error when output text is missing", async () => {
    const { createOpenAIClient } = await import("./client");
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(vi.fn().mockResolvedValue({ output_text: "" })),
    });

    await expect(client.analyzeCreative(FAKE_REQUEST)).rejects.toThrowError(/no output text/i);
  });

  it("throws a deterministic error when output text is not valid JSON", async () => {
    const { createOpenAIClient } = await import("./client");
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(vi.fn().mockResolvedValue({ output_text: "{not valid json" })),
    });

    await expect(client.analyzeCreative(FAKE_REQUEST)).rejects.toThrowError(/not valid JSON/i);
  });

  it("throws a deterministic error when parsed JSON is structurally invalid", async () => {
    const { createOpenAIClient } = await import("./client");
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () =>
        fakeTransport(vi.fn().mockResolvedValue({ output_text: JSON.stringify({ unexpected: "shape" }) })),
    });

    await expect(client.analyzeCreative(FAKE_REQUEST)).rejects.toThrowError(/strengths.*must be an array/i);
  });

  it("rejects invalid nested finding fields", async () => {
    const { createOpenAIClient } = await import("./client");
    const body = validResponseBody({
      strengths: [{ category: 123, summary: "s", evidence: "e" }],
    });
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(vi.fn().mockResolvedValue({ output_text: JSON.stringify(body) })),
    });

    await expect(client.analyzeCreative(FAKE_REQUEST)).rejects.toThrowError(/strengths\[0\]\.category.*string/i);
  });

  it("rejects an invalid weakness blocking value", async () => {
    const { createOpenAIClient } = await import("./client");
    const body = validResponseBody({
      weaknesses: [{ category: "policy_risk", summary: "s", evidence: "e", blocking: "yes" }],
    });
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(vi.fn().mockResolvedValue({ output_text: JSON.stringify(body) })),
    });

    await expect(client.analyzeCreative(FAKE_REQUEST)).rejects.toThrowError(/weaknesses\[0\]\.blocking.*boolean/i);
  });

  it("rejects invalid bounding-box numbers", async () => {
    const { createOpenAIClient } = await import("./client");
    const body = validResponseBody({
      strengths: [
        {
          category: "policy_risk",
          summary: "s",
          evidence: "e",
          boundingBox: { x: "10", y: 1, width: 1, height: 1 },
        },
      ],
    });
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(vi.fn().mockResolvedValue({ output_text: JSON.stringify(body) })),
    });

    await expect(client.analyzeCreative(FAKE_REQUEST)).rejects.toThrowError(/boundingBox\.x.*finite number/i);
  });

  it("propagates an SDK error without replacing it with a generic error", async () => {
    const { createOpenAIClient } = await import("./client");
    class FakeAuthenticationError extends Error {}
    const sdkError = new FakeAuthenticationError("401 Incorrect API key provided");
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(vi.fn().mockRejectedValue(sdkError)),
    });

    await expect(client.analyzeCreative(FAKE_REQUEST)).rejects.toBe(sdkError);
  });
});

describe("application-owned error messages stay secret-safe", () => {
  const sensitiveMarkers = [SECRET_API_KEY, SECRET_PROMPT_MARKER, SECRET_IMAGE_MARKER];

  async function captureErrorMessage(outputText: string): Promise<string> {
    const { createOpenAIClient } = await import("./client");
    const client = createOpenAIClient({
      resolveConfig: () => FAKE_CONFIG,
      createTransport: () => fakeTransport(vi.fn().mockResolvedValue({ output_text: outputText })),
    });

    try {
      await client.analyzeCreative(FAKE_REQUEST);
      throw new Error("expected analyzeCreative to reject");
    } catch (error) {
      return (error as Error).message;
    }
  }

  it("never includes secrets, the prompt, or the image payload when output text is missing", async () => {
    const message = await captureErrorMessage("");
    for (const marker of sensitiveMarkers) {
      expect(message).not.toContain(marker);
    }
  });

  it("never includes secrets, the prompt, or the image payload when JSON is invalid", async () => {
    const message = await captureErrorMessage(`{not valid json but mentions ${SECRET_PROMPT_MARKER}`);
    for (const marker of sensitiveMarkers) {
      expect(message).not.toContain(marker);
    }
  });

  it("never includes secrets, the prompt, the image payload, or complete model output when structurally invalid", async () => {
    const modelOutputMarker = "COMPLETE_MODEL_OUTPUT_MARKER_" + "x".repeat(200);
    const message = await captureErrorMessage(JSON.stringify({ note: modelOutputMarker }));
    for (const marker of [...sensitiveMarkers, modelOutputMarker]) {
      expect(message).not.toContain(marker);
    }
  });
});
