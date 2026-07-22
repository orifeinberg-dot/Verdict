import { describe, expect, it } from "vitest";
import {
  assembleExecutiveSummary,
  computeConfidence,
  computeVerdict,
  selectAnchorFinding,
} from "./decision-engine";
import type { AnnotatedPoint, AnnotationCategory, CreativeContext, Weakness } from "./types";

function weakness(overrides: Partial<Weakness> & Pick<Weakness, "id" | "category" | "blocking">): Weakness {
  return {
    summary: "summary",
    evidence: "evidence",
    ...overrides,
  };
}

function strength(overrides: Partial<AnnotatedPoint> & Pick<AnnotatedPoint, "id" | "category">): AnnotatedPoint {
  return {
    summary: "summary",
    evidence: "evidence",
    ...overrides,
  };
}

function context(overrides: Partial<CreativeContext> = {}): CreativeContext {
  return {
    brandName: "Acme",
    website: "https://acme.example",
    industry: "retail",
    campaignObjective: "conversions",
    campaignType: "evergreen",
    ...overrides,
  };
}

describe("computeVerdict", () => {
  it("a blocking weakness produces dont_launch", () => {
    const weaknesses = [weakness({ id: "w1", category: "policy_risk", blocking: true })];
    expect(computeVerdict(weaknesses)).toBe("dont_launch");
  });

  it("a notable non-blocking high-stakes weakness produces test", () => {
    const weaknesses = [weakness({ id: "w1", category: "legibility", blocking: false })];
    expect(computeVerdict(weaknesses)).toBe("test");
  });

  it("no meaningful weaknesses produces launch", () => {
    expect(computeVerdict([])).toBe("launch");
  });

  it("a non-blocking brand_consistency weakness alone produces launch", () => {
    const weaknesses = [weakness({ id: "w1", category: "brand_consistency", blocking: false })];
    expect(computeVerdict(weaknesses)).toBe("launch");
  });

  it("is deterministic for identical input", () => {
    const weaknesses = [
      weakness({ id: "w1", category: "message_clarity", blocking: false }),
      weakness({ id: "w2", category: "brand_consistency", blocking: false }),
    ];
    expect(computeVerdict(weaknesses)).toBe(computeVerdict(weaknesses));
  });

  it("a blocking weakness overrides verdict regardless of its position in the array", () => {
    const blocking = weakness({ id: "w1", category: "policy_risk", blocking: true });
    const notable = weakness({ id: "w2", category: "legibility", blocking: false });

    expect(computeVerdict([blocking, notable])).toBe("dont_launch");
    expect(computeVerdict([notable, blocking])).toBe("dont_launch");
  });
});

describe("computeConfidence", () => {
  it("produces identical confidence for identical inputs", () => {
    const strengths = [strength({ id: "s1", category: "policy_risk" })];
    const weaknesses = [weakness({ id: "w1", category: "legibility", blocking: false })];
    const coverage: AnnotationCategory[] = ["policy_risk", "legibility"];

    expect(computeConfidence(strengths, weaknesses, coverage)).toBe(
      computeConfidence(strengths, weaknesses, coverage),
    );
  });

  it("handles empty findings and empty coverage without exceptions, at the minimum bound", () => {
    expect(computeConfidence([], [], [])).toBe(1);
  });

  it("reaches the maximum bound with full coverage and saturated findings", () => {
    const strengths = [
      strength({ id: "s1", category: "policy_risk" }),
      strength({ id: "s2", category: "legibility" }),
      strength({ id: "s3", category: "message_clarity" }),
      strength({ id: "s4", category: "brand_consistency" }),
    ];
    const weaknesses = [
      weakness({ id: "w1", category: "brand_consistency", blocking: false }),
      weakness({ id: "w2", category: "message_clarity", blocking: false }),
    ];
    const coverage: AnnotationCategory[] = ["policy_risk", "legibility", "message_clarity", "brand_consistency"];

    expect(computeConfidence(strengths, weaknesses, coverage)).toBe(99);
  });

  it("stays within the documented [1, 99] domain range", () => {
    const value = computeConfidence([], [], []);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(99);
  });

  it("does not reduce the coverage component when more dimensions are covered", () => {
    const strengths: AnnotatedPoint[] = [];
    const weaknesses: Weakness[] = [];

    const withTwoDims = computeConfidence(strengths, weaknesses, ["policy_risk", "legibility"]);
    const withThreeDims = computeConfidence(strengths, weaknesses, [
      "policy_risk",
      "legibility",
      "message_clarity",
    ]);

    expect(withThreeDims).toBeGreaterThanOrEqual(withTwoDims);
  });

  it("deduplicates repeated coverage entries rather than double-counting them", () => {
    const withDuplicates = computeConfidence([], [], ["policy_risk", "policy_risk", "policy_risk"]);
    const withoutDuplicates = computeConfidence([], [], ["policy_risk"]);

    expect(withDuplicates).toBe(withoutDuplicates);
  });

  it("increases finding-sufficiency contribution as findings accumulate, up to saturation", () => {
    const coverage: AnnotationCategory[] = ["policy_risk", "legibility"];
    const makeWeaknesses = (count: number): Weakness[] =>
      Array.from({ length: count }, (_, index) =>
        weakness({ id: `w${index}`, category: "brand_consistency", blocking: false }),
      );

    const zero = computeConfidence([], makeWeaknesses(0), coverage);
    const three = computeConfidence([], makeWeaknesses(3), coverage);
    const six = computeConfidence([], makeWeaknesses(6), coverage);
    const eight = computeConfidence([], makeWeaknesses(8), coverage);

    expect(zero).toBe(25);
    expect(three).toBe(50);
    expect(six).toBe(75);
    // Depth saturates at DEPTH_SATURATION_COUNT (6) findings; more findings
    // beyond that do not add further depth score.
    expect(eight).toBe(six);
  });
});

describe("selectAnchorFinding", () => {
  it("dont_launch selects a blocking weakness", () => {
    const blocking = weakness({ id: "w1", category: "policy_risk", blocking: true });
    const nonBlocking = weakness({ id: "w2", category: "legibility", blocking: false });

    expect(selectAnchorFinding("dont_launch", [], [blocking, nonBlocking])).toBe(blocking);
  });

  it("dont_launch breaks ties between blocking weaknesses by dimension priority", () => {
    const legibilityBlocking = weakness({ id: "w1", category: "legibility", blocking: true });
    const policyBlocking = weakness({ id: "w2", category: "policy_risk", blocking: true });

    // policy_risk outranks legibility regardless of array position.
    expect(selectAnchorFinding("dont_launch", [], [legibilityBlocking, policyBlocking])).toBe(policyBlocking);
  });

  it("dont_launch breaks same-dimension ties by first occurrence", () => {
    const first = weakness({ id: "w1", category: "policy_risk", blocking: true });
    const second = weakness({ id: "w2", category: "policy_risk", blocking: true });

    expect(selectAnchorFinding("dont_launch", [], [first, second])).toBe(first);
  });

  it("dont_launch with no blocking weakness falls back to a notable high-stakes weakness", () => {
    const notable = weakness({ id: "w1", category: "legibility", blocking: false });
    expect(selectAnchorFinding("dont_launch", [], [notable])).toBe(notable);
  });

  it("dont_launch with no eligible weakness at all falls back to any weakness", () => {
    const onlyBrand = weakness({ id: "w1", category: "brand_consistency", blocking: false });
    expect(selectAnchorFinding("dont_launch", [], [onlyBrand])).toBe(onlyBrand);
  });

  it("dont_launch with no weaknesses at all returns undefined", () => {
    expect(selectAnchorFinding("dont_launch", [], [])).toBeUndefined();
  });

  it("test selects a notable non-blocking high-stakes weakness", () => {
    const notable = weakness({ id: "w1", category: "message_clarity", blocking: false });
    const brand = weakness({ id: "w2", category: "brand_consistency", blocking: false });

    expect(selectAnchorFinding("test", [], [brand, notable])).toBe(notable);
  });

  it("test with no eligible weakness falls back to any weakness", () => {
    const brand = weakness({ id: "w1", category: "brand_consistency", blocking: false });
    expect(selectAnchorFinding("test", [], [brand])).toBe(brand);
  });

  it("test with no weaknesses at all returns undefined", () => {
    expect(selectAnchorFinding("test", [], [])).toBeUndefined();
  });

  it("launch selects the strongest strength by dimension priority", () => {
    const brandStrength = strength({ id: "s1", category: "brand_consistency" });
    const policyStrength = strength({ id: "s2", category: "policy_risk" });

    expect(selectAnchorFinding("launch", [brandStrength, policyStrength], [])).toBe(policyStrength);
  });

  it("launch with no strengths returns undefined", () => {
    expect(selectAnchorFinding("launch", [], [])).toBeUndefined();
  });

  it("is deterministic across repeated calls with identical input", () => {
    const strengths = [strength({ id: "s1", category: "message_clarity" })];
    expect(selectAnchorFinding("launch", strengths, [])).toBe(
      selectAnchorFinding("launch", strengths, []),
    );
  });
});

describe("assembleExecutiveSummary", () => {
  it("is deterministic for identical input", () => {
    const anchor = strength({ id: "s1", category: "policy_risk", summary: "Clean pass." });
    const ctx = context();

    expect(assembleExecutiveSummary("launch", anchor, ctx)).toBe(
      assembleExecutiveSummary("launch", anchor, ctx),
    );
  });

  it("reflects the launch verdict and anchor summary", () => {
    const anchor = strength({ id: "s1", category: "policy_risk", summary: "Clean pass." });
    const summary = assembleExecutiveSummary("launch", anchor, context({ brandName: "Acme" }));

    expect(summary).toContain("Acme");
    expect(summary).toContain("Clean pass.");
  });

  it("reflects the test verdict and anchor summary", () => {
    const anchor = weakness({ id: "w1", category: "legibility", blocking: false, summary: "Hard to read." });
    const summary = assembleExecutiveSummary("test", anchor, context({ brandName: "Acme" }));

    expect(summary).toContain("Acme");
    expect(summary).toContain("Hard to read.");
  });

  it("reflects the dont_launch verdict and anchor summary", () => {
    const anchor = weakness({ id: "w1", category: "policy_risk", blocking: true, summary: "Policy violation." });
    const summary = assembleExecutiveSummary("dont_launch", anchor, context({ brandName: "Acme" }));

    expect(summary).toContain("Acme");
    expect(summary).toContain("Policy violation.");
  });

  it("falls back to verdict-only language when the anchor is missing, for each verdict", () => {
    const ctx = context({ brandName: "Acme" });

    expect(assembleExecutiveSummary("launch", undefined, ctx)).toContain("Acme");
    expect(assembleExecutiveSummary("test", undefined, ctx)).toContain("Acme");
    expect(assembleExecutiveSummary("dont_launch", undefined, ctx)).toContain("Acme");
  });

  it("falls back to a generic brand label when brandName is empty", () => {
    const summary = assembleExecutiveSummary("launch", undefined, context({ brandName: "" }));
    expect(summary).toContain("This creative");
  });

  it("uses the app-install objective label for app_installs campaigns", () => {
    const summary = assembleExecutiveSummary(
      "launch",
      undefined,
      context({ campaignObjective: "app_installs" }),
    );
    expect(summary).toContain("app-install");
  });
});
