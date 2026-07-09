// Deliberately plain text, not a meter/progress bar — visually subordinate
// to the verdict badge, per UI_SPEC.md, not competing for attention.
export function ConfidenceScore({ confidence }: { confidence: number }) {
  return (
    <p className="text-sm text-foreground/60">
      <span className="font-medium text-foreground/80">{confidence}%</span>{" "}
      confidence
    </p>
  );
}
