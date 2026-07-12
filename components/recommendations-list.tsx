// Plain list, deliberately with no marker/hotspot linkage — a
// recommendation is an action, not a location. See UI_SPEC.md. Numbered
// as a concrete action list, distinct from the Weaknesses list it's
// derived from — no positional link back to a specific weakness, since
// that correspondence isn't part of the report's data model.
export function RecommendationsList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        <p className="text-sm text-foreground/50">Concrete next steps to improve it.</p>
      </div>
      <ol className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-3 rounded-lg border border-foreground/10 px-4 py-3 text-sm text-foreground/80"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium text-foreground/70">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
