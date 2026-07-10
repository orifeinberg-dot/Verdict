import { ConfidenceScore } from "@/components/confidence-score";

const EXAMPLE_STRENGTH = {
  category: "Message clarity",
  summary: "The call-to-action is clear and matches the campaign's goal.",
};

const EXAMPLE_WEAKNESS = {
  category: "Brand consistency",
  summary:
    "Logo placement is small enough that brand recall is weaker than it needs to be.",
};

// A static, non-interactive representation of the real /verdict/[id]
// report UI for the landing page — reuses the same color tokens and row
// styling as the live report so a first-time visitor gets an accurate
// preview, not a conceptual mockup. Deliberately not the live components
// themselves: the real VerdictBadge renders an <h1>, which would collide
// with the landing page's own page heading, and the real annotation rows
// are interactive <button>s, which this preview must not be.
export function VerdictPreview() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3 text-left">
      <span className="text-xs font-medium tracking-wide text-foreground/40 uppercase">
        Example Verdict
      </span>

      <div className="flex flex-col gap-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 sm:flex-row">
        <div
          className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.05] sm:w-32"
          style={{ aspectRatio: "4 / 5" }}
        >
          <span
            aria-hidden="true"
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-marker-strength shadow-md"
            style={{ left: "68%", top: "26%" }}
          />
          <span
            aria-hidden="true"
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-marker-weakness shadow-md"
            style={{ left: "34%", top: "70%" }}
          />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center rounded-full bg-verdict-test/10 px-3 py-1 text-xs font-medium tracking-wide text-verdict-test uppercase">
              Verdict
            </span>
            <span className="text-3xl font-semibold tracking-tight text-verdict-test">
              Test
            </span>
            <ConfidenceScore confidence={68} />
          </div>

          <div className="flex flex-col gap-2">
            <FindingRow kind="strength" {...EXAMPLE_STRENGTH} />
            <FindingRow kind="weakness" {...EXAMPLE_WEAKNESS} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FindingRow({
  kind,
  category,
  summary,
}: {
  kind: "strength" | "weakness";
  category: string;
  summary: string;
}) {
  const dotClass = kind === "strength" ? "bg-marker-strength" : "bg-marker-weakness";

  return (
    <div className="flex w-full flex-col gap-1.5 rounded-lg border border-foreground/10 px-3 py-2.5 text-left">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-foreground/60">
          {category}
        </span>
      </div>
      <p className="text-xs text-foreground/70">{summary}</p>
    </div>
  );
}
