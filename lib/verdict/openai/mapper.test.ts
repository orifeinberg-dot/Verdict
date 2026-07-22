import { describe, expect, it } from "vitest";
import { mapOpenAIResponse } from "./mapper";
import type { OpenAIPerceptionResponse, RawFinding, RawWeakness } from "./schema";

function rawFinding(overrides: Partial<RawFinding> = {}): RawFinding {
  return {
    category: "policy_risk",
    summary: "summary text",
    evidence: "evidence text",
    ...overrides,
  };
}

function rawWeakness(overrides: Partial<RawWeakness> = {}): RawWeakness {
  return {
    ...rawFinding(),
    blocking: false,
    ...overrides,
  };
}

function response(overrides: Partial<OpenAIPerceptionResponse> = {}): OpenAIPerceptionResponse {
  return {
    strengths: [],
    weaknesses: [],
    recommendations: [],
    ...overrides,
  };
}

describe("mapOpenAIResponse", () => {
  it("maps a full response's content fields into the domain shape", () => {
    const raw = response({
      strengths: [rawFinding({ category: "legibility", summary: "Clear headline.", evidence: "Large type." })],
      weaknesses: [
        rawWeakness({
          category: "policy_risk",
          summary: "Dense overlay text.",
          evidence: "Text covers a third of the image.",
          blocking: true,
        }),
      ],
      recommendations: ["Reduce overlay text."],
    });

    const result = mapOpenAIResponse(raw);

    expect(result.strengths).toHaveLength(1);
    expect(result.strengths[0]).toMatchObject({
      category: "legibility",
      summary: "Clear headline.",
      evidence: "Large type.",
    });

    expect(result.weaknesses).toHaveLength(1);
    expect(result.weaknesses[0]).toMatchObject({
      category: "policy_risk",
      summary: "Dense overlay text.",
      evidence: "Text covers a third of the image.",
      blocking: true,
    });

    expect(result.recommendations).toEqual(["Reduce overlay text."]);
  });

  it("assigns a fresh, application-owned id to every finding", () => {
    const raw = response({
      strengths: [rawFinding(), rawFinding()],
      weaknesses: [rawWeakness()],
    });

    const result = mapOpenAIResponse(raw);
    const ids = [...result.strengths, ...result.weaknesses].map((finding) => finding.id);

    for (const id of ids) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("narrows each of the four known category strings into the domain type", () => {
    const raw = response({
      strengths: [
        rawFinding({ category: "policy_risk" }),
        rawFinding({ category: "legibility" }),
        rawFinding({ category: "brand_consistency" }),
        rawFinding({ category: "message_clarity" }),
      ],
    });

    const result = mapOpenAIResponse(raw);

    expect(result.strengths.map((finding) => finding.category)).toEqual([
      "policy_risk",
      "legibility",
      "brand_consistency",
      "message_clarity",
    ]);
  });

  it("rejects an unknown category with a deterministic, descriptive error", () => {
    const raw = response({
      strengths: [rawFinding({ category: "not_a_real_category" })],
    });

    expect(() => mapOpenAIResponse(raw)).toThrowError(/not_a_real_category/);
  });

  it("rejects an unknown category on a weakness the same way", () => {
    const raw = response({
      weaknesses: [rawWeakness({ category: "totally_unknown" })],
    });

    expect(() => mapOpenAIResponse(raw)).toThrowError(/totally_unknown/);
  });

  it("preserves recommendation content and order exactly", () => {
    const raw = response({
      recommendations: ["Third.", "First.", "Second.", "First."],
    });

    const result = mapOpenAIResponse(raw);

    expect(result.recommendations).toEqual(["Third.", "First.", "Second.", "First."]);
  });

  it("preserves bounding boxes unchanged", () => {
    const boundingBox = { x: 10, y: 20, width: 30, height: 15 };
    const raw = response({
      strengths: [rawFinding({ boundingBox })],
    });

    const result = mapOpenAIResponse(raw);

    expect(result.strengths[0].boundingBox).toEqual(boundingBox);
  });

  it("leaves boundingBox undefined when the raw finding has none", () => {
    const raw = response({
      strengths: [rawFinding()],
    });

    const result = mapOpenAIResponse(raw);

    expect(result.strengths[0].boundingBox).toBeUndefined();
  });

  it("does not perform business validation — a blocking brand_consistency proposal passes through unchanged", () => {
    const raw = response({
      weaknesses: [rawWeakness({ category: "brand_consistency", blocking: true })],
    });

    const result = mapOpenAIResponse(raw);

    // Coercing this to false is validation.ts's job (see validation.test.ts),
    // not the mapper's — this test guards that separation.
    expect(result.weaknesses[0].blocking).toBe(true);
  });
});
