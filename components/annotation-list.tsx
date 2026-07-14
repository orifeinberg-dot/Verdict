import type { AnnotatedPoint, AnnotationCategory } from "@/lib/verdict/types";

const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  policy_risk: "Policy risk",
  legibility: "Legibility",
  brand_consistency: "Brand consistency",
  message_clarity: "Message clarity",
};

type Kind = "strength" | "weakness";

type ListProps = {
  points: AnnotatedPoint[];
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

type Props = ListProps & {
  title: string;
  description: string;
  kind: Kind;
  emptyMessage: string;
};

// StrengthsList and WeaknessesList are visually identical except for
// color and copy, so both are thin wrappers around this shared renderer.
export function AnnotationList({
  title,
  description,
  kind,
  points,
  activeId,
  onHover,
  onSelect,
  emptyMessage,
}: Props) {
  const dotClass = kind === "strength" ? "bg-marker-strength" : "bg-marker-weakness";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-foreground/50">{description}</p>
      </div>
      {points.length === 0 ? (
        <p className="text-sm font-medium text-foreground/80">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {points.map((point) => (
            <li key={point.id} id={`point-${point.id}`}>
              <Row
                point={point}
                dotClass={dotClass}
                isActive={point.id === activeId}
                onHover={onHover}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  point,
  dotClass,
  isActive,
  onHover,
  onSelect,
}: {
  point: AnnotatedPoint;
  dotClass: string;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const hasMarker = point.boundingBox !== undefined;

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {hasMarker && <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />}
        <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-foreground/60">
          {CATEGORY_LABELS[point.category]}
        </span>
        {!hasMarker && (
          <span className="text-xs text-foreground/60">Applies to the overall creative</span>
        )}
      </div>
      <p className="text-sm text-foreground/80">{point.summary}</p>
    </>
  );

  const baseClass = `flex w-full flex-col gap-1.5 rounded-lg border px-4 py-3 text-left transition-colors ${
    isActive
      ? "border-foreground/50 bg-foreground/[0.07] shadow-sm"
      : "border-foreground/10"
  }`;

  if (!hasMarker) {
    return <div className={baseClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(point.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(point.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(point.id)}
      className={`${baseClass} cursor-pointer hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {content}
    </button>
  );
}

export function StrengthsList(props: ListProps) {
  return (
    <AnnotationList
      title="Strengths"
      description="What's working well."
      kind="strength"
      emptyMessage="No standout strengths flagged for this creative."
      {...props}
    />
  );
}

export function WeaknessesList(props: ListProps) {
  return (
    <AnnotationList
      title="Weaknesses"
      description="What's holding this creative back."
      kind="weakness"
      emptyMessage="No significant weaknesses identified."
      {...props}
    />
  );
}
