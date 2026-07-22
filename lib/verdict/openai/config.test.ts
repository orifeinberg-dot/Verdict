import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_OPENAI_MAX_OUTPUT_TOKENS,
  DEFAULT_OPENAI_MAX_RETRIES,
  DEFAULT_OPENAI_TIMEOUT_MS,
  resolveOpenAIConfig,
} from "./config";

const SECRET_API_KEY = "sk-SUPER-SECRET-DO-NOT-LEAK-12345";

// `NODE_ENV` is a fixed literal here (never read from the real process),
// so these tests stay fully independent of the developer's machine — the
// same reason every other field below is always passed explicitly.
function validEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    OPENAI_API_KEY: SECRET_API_KEY,
    OPENAI_MODEL: "gpt-test-model",
    ...overrides,
  };
}

describe("resolveOpenAIConfig", () => {
  it("resolves a complete, valid configuration", () => {
    const config = resolveOpenAIConfig(
      validEnv({
        OPENAI_TIMEOUT_MS: "1000",
        OPENAI_MAX_RETRIES: "5",
        OPENAI_MAX_OUTPUT_TOKENS: "500",
      }),
    );

    expect(config).toEqual({
      apiKey: SECRET_API_KEY,
      model: "gpt-test-model",
      timeoutMs: 1000,
      maxRetries: 5,
      maxOutputTokens: 500,
    });
  });

  it("trims surrounding whitespace from the API key and model", () => {
    const config = resolveOpenAIConfig(
      validEnv({
        OPENAI_API_KEY: `  ${SECRET_API_KEY}  `,
        OPENAI_MODEL: "  gpt-test-model  ",
      }),
    );

    expect(config.apiKey).toBe(SECRET_API_KEY);
    expect(config.model).toBe("gpt-test-model");
  });

  it("applies all numeric defaults when no overrides are present", () => {
    const config = resolveOpenAIConfig(validEnv());

    expect(config.timeoutMs).toBe(DEFAULT_OPENAI_TIMEOUT_MS);
    expect(config.maxRetries).toBe(DEFAULT_OPENAI_MAX_RETRIES);
    expect(config.maxOutputTokens).toBe(DEFAULT_OPENAI_MAX_OUTPUT_TOKENS);
  });

  it("applies valid numeric overrides, including trimming whitespace", () => {
    const config = resolveOpenAIConfig(
      validEnv({
        OPENAI_TIMEOUT_MS: " 90000 ",
        OPENAI_MAX_RETRIES: " 0 ",
        OPENAI_MAX_OUTPUT_TOKENS: " 4000 ",
      }),
    );

    expect(config.timeoutMs).toBe(90_000);
    expect(config.maxRetries).toBe(0);
    expect(config.maxOutputTokens).toBe(4000);
  });

  it("rejects a missing API key", () => {
    expect(() => resolveOpenAIConfig(validEnv({ OPENAI_API_KEY: undefined }))).toThrowError(/OPENAI_API_KEY/);
  });

  it("rejects a blank API key", () => {
    expect(() => resolveOpenAIConfig(validEnv({ OPENAI_API_KEY: "   " }))).toThrowError(/OPENAI_API_KEY/);
  });

  it("rejects a missing model", () => {
    expect(() => resolveOpenAIConfig(validEnv({ OPENAI_MODEL: undefined }))).toThrowError(/OPENAI_MODEL/);
  });

  it("rejects a blank model", () => {
    expect(() => resolveOpenAIConfig(validEnv({ OPENAI_MODEL: "   " }))).toThrowError(/OPENAI_MODEL/);
  });

  describe.each([
    ["empty override", ""],
    ["decimal value", "10.5"],
    ["negative value", "-5"],
    ["zero (prohibited for timeout)", "0"],
    ["NaN", "NaN"],
    ["Infinity", "Infinity"],
    ["partially numeric string", "2000tokens"],
  ])("rejects an invalid OPENAI_TIMEOUT_MS: %s (%s)", (_label, value) => {
    it("throws naming OPENAI_TIMEOUT_MS", () => {
      expect(() => resolveOpenAIConfig(validEnv({ OPENAI_TIMEOUT_MS: value }))).toThrowError(/OPENAI_TIMEOUT_MS/);
    });
  });

  describe.each([
    ["empty override", ""],
    ["decimal value", "1.5"],
    ["negative value", "-1"],
    ["NaN", "NaN"],
    ["Infinity", "Infinity"],
    ["partially numeric string", "3retries"],
  ])("rejects an invalid OPENAI_MAX_RETRIES: %s (%s)", (_label, value) => {
    it("throws naming OPENAI_MAX_RETRIES", () => {
      expect(() => resolveOpenAIConfig(validEnv({ OPENAI_MAX_RETRIES: value }))).toThrowError(/OPENAI_MAX_RETRIES/);
    });
  });

  describe.each([
    ["empty override", ""],
    ["decimal value", "2000.5"],
    ["negative value", "-100"],
    ["zero (prohibited for output tokens)", "0"],
    ["NaN", "NaN"],
    ["Infinity", "Infinity"],
    ["partially numeric string", "2000tokens"],
  ])("rejects an invalid OPENAI_MAX_OUTPUT_TOKENS: %s (%s)", (_label, value) => {
    it("throws naming OPENAI_MAX_OUTPUT_TOKENS", () => {
      expect(() => resolveOpenAIConfig(validEnv({ OPENAI_MAX_OUTPUT_TOKENS: value }))).toThrowError(
        /OPENAI_MAX_OUTPUT_TOKENS/,
      );
    });
  });

  it("never exposes the supplied API key in a thrown error message", () => {
    let thrown: unknown;
    try {
      resolveOpenAIConfig(validEnv({ OPENAI_TIMEOUT_MS: "not-a-number" }));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).not.toContain(SECRET_API_KEY);
  });

  it("does not mutate the supplied environment object", () => {
    const env = validEnv({ OPENAI_TIMEOUT_MS: "1000" });
    const snapshot = { ...env };

    resolveOpenAIConfig(env);

    expect(env).toEqual(snapshot);
  });
});

describe("resolveOpenAIConfig laziness", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
    if (originalModel === undefined) {
      delete process.env.OPENAI_MODEL;
    } else {
      process.env.OPENAI_MODEL = originalModel;
    }
    vi.resetModules();
  });

  it("does not resolve configuration merely by importing the module", async () => {
    // With required env vars absent process-wide, importing must not
    // throw — proving no top-level `resolveOpenAIConfig()` call exists.
    await expect(import("./config")).resolves.toBeDefined();
  });

  it("only fails once resolveOpenAIConfig() is actually invoked", async () => {
    const { resolveOpenAIConfig: freshResolveOpenAIConfig } = await import("./config");
    expect(() => freshResolveOpenAIConfig()).toThrowError(/OPENAI_API_KEY/);
  });
});
