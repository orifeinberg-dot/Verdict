import { describe, expect, it } from "vitest";
import { validateWeaknesses } from "./validation";
import type { AnnotationCategory, Weakness } from "./types";

function weakness(id: string, category: AnnotationCategory, blocking: boolean): Weakness {
  return {
    id,
    category,
    summary: `${category} summary`,
    evidence: `${category} evidence`,
    blocking,
  };
}

describe("validateWeaknesses", () => {
  it("normalizes a blocking brand_consistency weakness to non-blocking", () => {
    const input = [weakness("w1", "brand_consistency", true)];
    const [result] = validateWeaknesses(input);

    expect(result.blocking).toBe(false);
  });

  it("preserves blocking:true for the eligible policy_risk category", () => {
    const input = [weakness("w1", "policy_risk", true)];
    const [result] = validateWeaknesses(input);

    expect(result.blocking).toBe(true);
  });

  it("preserves blocking:true for the eligible legibility category", () => {
    const input = [weakness("w1", "legibility", true)];
    const [result] = validateWeaknesses(input);

    expect(result.blocking).toBe(true);
  });

  it("preserves blocking:true for the eligible message_clarity category", () => {
    const input = [weakness("w1", "message_clarity", true)];
    const [result] = validateWeaknesses(input);

    expect(result.blocking).toBe(true);
  });

  it("leaves non-blocking weaknesses of any category unchanged", () => {
    const input = [
      weakness("w1", "brand_consistency", false),
      weakness("w2", "policy_risk", false),
      weakness("w3", "legibility", false),
      weakness("w4", "message_clarity", false),
    ];

    const result = validateWeaknesses(input);

    result.forEach((weaknessResult, index) => {
      expect(weaknessResult.blocking).toBe(false);
      expect(weaknessResult.category).toBe(input[index].category);
    });
  });

  it("retains every weakness and its array order", () => {
    const input = [
      weakness("w1", "policy_risk", true),
      weakness("w2", "brand_consistency", true),
      weakness("w3", "legibility", false),
      weakness("w4", "message_clarity", true),
    ];

    const result = validateWeaknesses(input);

    expect(result).toHaveLength(input.length);
    expect(result.map((w) => w.id)).toEqual(["w1", "w2", "w3", "w4"]);
  });

  it("does not mutate the input array or its elements", () => {
    const input = [weakness("w1", "brand_consistency", true), weakness("w2", "policy_risk", true)];
    const snapshot = JSON.parse(JSON.stringify(input));

    validateWeaknesses(input);

    expect(input).toEqual(snapshot);
  });

  it("returns a newly created object for a weakness that needed correction", () => {
    const original = weakness("w1", "brand_consistency", true);
    const [result] = validateWeaknesses([original]);

    expect(result).not.toBe(original);
    expect(result).toEqual({ ...original, blocking: false });
  });

  it("preserves object references for weaknesses that did not need correction", () => {
    const nonBlocking = weakness("w1", "brand_consistency", false);
    const eligibleBlocking = weakness("w2", "policy_risk", true);

    const [resultNonBlocking, resultEligible] = validateWeaknesses([nonBlocking, eligibleBlocking]);

    expect(resultNonBlocking).toBe(nonBlocking);
    expect(resultEligible).toBe(eligibleBlocking);
  });

  it("produces equivalent output when run repeatedly on the same input", () => {
    const input = [weakness("w1", "brand_consistency", true), weakness("w2", "legibility", true)];

    expect(validateWeaknesses(input)).toEqual(validateWeaknesses(input));
  });

  it("is idempotent when re-run on its own output", () => {
    const input = [weakness("w1", "brand_consistency", true), weakness("w2", "policy_risk", true)];

    const once = validateWeaknesses(input);
    const twice = validateWeaknesses(once);

    expect(twice).toEqual(once);
  });
});
