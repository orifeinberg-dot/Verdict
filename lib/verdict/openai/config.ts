/**
 * The OpenAI configuration boundary: resolves and validates
 * environment-based configuration for the future OpenAI integration,
 * in one place, rather than through scattered `process.env` reads or
 * transport-layer magic constants.
 *
 * Scope — this module owns:
 * - reading environment values
 * - applying application defaults
 * - parsing numeric values
 * - validating configuration
 * - returning a typed `OpenAIConfig`
 *
 * This module does NOT own: SDK construction, API requests, response
 * schemas, prompt construction, provider selection, retry execution,
 * timeout execution, logging, or verdict logic. `maxRetries` and
 * `timeoutMs` express policy only — their runtime behavior belongs to a
 * future client-layer implementation, not this module.
 *
 * Nothing here resolves configuration at import time — see
 * `resolveOpenAIConfig`'s own doc comment — and nothing here is imported
 * by any production code path yet, so this module has no effect on the
 * currently-active (mock) perception pipeline.
 */

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  maxOutputTokens: number;
}

export const DEFAULT_OPENAI_TIMEOUT_MS = 45_000;
export const DEFAULT_OPENAI_MAX_RETRIES = 2;
export const DEFAULT_OPENAI_MAX_OUTPUT_TOKENS = 2_000;

/**
 * Reads a required, non-secret-safe string value: trims it, and throws a
 * deterministic error naming the missing environment variable if it's
 * absent or blank after trimming. Never echoes the value itself back in
 * the error — callers pass secret values (e.g. `OPENAI_API_KEY`) through
 * this same path, so the message must stay safe regardless of which key
 * is being read.
 */
function requireNonBlankString(env: NodeJS.ProcessEnv, key: string): string {
  const trimmed = env[key]?.trim() ?? "";
  if (trimmed === "") {
    throw new Error(`Missing required OpenAI configuration: ${key} must be set to a non-empty value.`);
  }
  return trimmed;
}

/**
 * Strictly parses a trimmed string as an integer: the entire string must
 * be an optional "-" followed by one or more digits, nothing else. Unlike
 * `Number()`/`parseInt()`, this rejects decimals ("10.5"), the literal
 * strings "NaN"/"Infinity", empty strings, and partially numeric strings
 * such as "2000tokens" — none of which are legal integer overrides.
 */
function parseStrictInteger(trimmed: string): number | null {
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * Resolves one numeric override: `defaultValue` when the environment
 * variable is entirely absent, or a validated integer >= `minValue` when
 * it's present. A present-but-invalid value (blank, decimal, negative
 * where prohibited, non-numeric, etc.) always throws — it is never
 * silently coerced or replaced by the default, since an explicit but
 * broken override should fail loudly rather than be masked.
 */
function resolveIntegerOverride(env: NodeJS.ProcessEnv, key: string, defaultValue: number, minValue: number): number {
  const raw = env[key];
  if (raw === undefined) {
    return defaultValue;
  }

  const trimmed = raw.trim();
  const parsed = parseStrictInteger(trimmed);
  if (parsed === null || parsed < minValue) {
    throw new Error(
      `Invalid OpenAI configuration: ${key} must be an integer >= ${minValue}, but got "${raw}".`,
    );
  }
  return parsed;
}

/**
 * Resolves the full `OpenAIConfig` from environment variables, defaulting
 * to `process.env` when no environment object is supplied. Deliberately
 * lazy: this function must be *called* to have any effect. It is never
 * invoked at module-import time by this file, which is what lets the
 * OpenAI subsystem be imported freely during tests, builds, and
 * development even when `OPENAI_API_KEY`/`OPENAI_MODEL` are unset.
 *
 * Throws a descriptive error — naming the offending environment variable,
 * never the supplied API key's value — when a required value is missing
 * or blank, or when a numeric override fails validation (see
 * `resolveIntegerOverride`).
 */
export function resolveOpenAIConfig(env: NodeJS.ProcessEnv = process.env): OpenAIConfig {
  const apiKey = requireNonBlankString(env, "OPENAI_API_KEY");
  const model = requireNonBlankString(env, "OPENAI_MODEL");

  const timeoutMs = resolveIntegerOverride(env, "OPENAI_TIMEOUT_MS", DEFAULT_OPENAI_TIMEOUT_MS, 1);
  const maxRetries = resolveIntegerOverride(env, "OPENAI_MAX_RETRIES", DEFAULT_OPENAI_MAX_RETRIES, 0);
  const maxOutputTokens = resolveIntegerOverride(
    env,
    "OPENAI_MAX_OUTPUT_TOKENS",
    DEFAULT_OPENAI_MAX_OUTPUT_TOKENS,
    1,
  );

  return { apiKey, model, timeoutMs, maxRetries, maxOutputTokens };
}
