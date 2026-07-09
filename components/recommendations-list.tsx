// Plain list, deliberately with no marker/hotspot linkage — a
// recommendation is an action, not a location. See UI_SPEC.md.
export function RecommendationsList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Recommendations</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="rounded-lg border border-foreground/10 px-4 py-3 text-sm text-foreground/80"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
