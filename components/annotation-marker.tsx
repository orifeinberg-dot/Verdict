import type { CSSProperties } from "react";

export type MarkerKind = "strength" | "weakness";

const DOT_CLASS: Record<MarkerKind, string> = {
  strength: "bg-marker-strength",
  weakness: "bg-marker-weakness",
};

const RING_CLASS: Record<MarkerKind, string> = {
  strength: "border-marker-strength",
  weakness: "border-marker-weakness",
};

type Props = {
  kind: MarkerKind;
  selected?: boolean;
  hovered?: boolean;
  className?: string;
  style?: CSSProperties;
};

// The one marker shape used everywhere a strength/weakness needs a visual
// dot — AnnotatedImage's real on-image markers and VerdictPreview's static
// landing-page mockup both render this, so the two can't drift out of sync
// the way separately hand-copied classes used to. Color is the only thing
// that varies by kind (see UI_SPEC.md's "Visual annotation design");
// selected/hovered only ever change the ring's opacity or the dot's scale,
// never the shape.
export function AnnotationMarker({
  kind,
  selected = false,
  hovered = false,
  className = "",
  style,
}: Props) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex h-8 w-8 items-center justify-center ${className}`}
      style={style}
    >
      {/* Persistent selected ring — a fixed halo around the dot, on its own
          layer so it stays visible even while a different marker is being
          hovered (hover and selected are independent states). */}
      <span
        className={`absolute inset-0 rounded-full border-2 transition-opacity duration-150 ${RING_CLASS[kind]} ${
          selected ? "opacity-100" : "opacity-0"
        }`}
      />
      <span
        className={`h-6 w-6 rounded-full shadow-md transition-transform duration-150 ${DOT_CLASS[kind]} ${
          hovered ? "scale-110" : "scale-100"
        }`}
      />
    </span>
  );
}

const BRACKET_COLOR_CLASS: Record<MarkerKind, string> = {
  strength: "border-marker-strength",
  weakness: "border-marker-weakness",
};

// Below this, a region's shorter side can't fit two 10px bracket arms plus
// a legible gap between them without the corners visually merging into a
// solid-looking border — callers should skip rendering brackets entirely
// below this and let the marker's own selected ring carry "selected"
// instead. Threshold is compared against the region's size in the image's
// *natural* pixel space, matching how marker-layout.ts already reasons
// about on-image geometry.
export const MIN_BRACKET_SIDE_PX = 32;
const ARM_PX = 10;
const ARM_STYLE = { width: ARM_PX, height: ARM_PX };

type BracketsProps = {
  kind: MarkerKind;
  visible: boolean;
  className?: string;
  style?: CSSProperties;
};

// Four fixed-size corner marks traced exactly at a region's true corners —
// the bracket motif itself never stretches or scales; only its position
// varies per region. Quieter than a filled/bordered rectangle by design:
// no fill, no full perimeter, so the marker (dot + ring) stays the primary
// focal point and this reads as supporting evidence around it.
export function AnnotationCornerBrackets({ kind, visible, className = "", style }: BracketsProps) {
  const colorClass = BRACKET_COLOR_CLASS[kind];
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
      style={style}
    >
      <span
        className={`absolute -left-px -top-px rounded-tl-[3px] border-l-2 border-t-2 ${colorClass}`}
        style={ARM_STYLE}
      />
      <span
        className={`absolute -right-px -top-px rounded-tr-[3px] border-r-2 border-t-2 ${colorClass}`}
        style={ARM_STYLE}
      />
      <span
        className={`absolute -bottom-px -left-px rounded-bl-[3px] border-b-2 border-l-2 ${colorClass}`}
        style={ARM_STYLE}
      />
      <span
        className={`absolute -bottom-px -right-px rounded-br-[3px] border-b-2 border-r-2 ${colorClass}`}
        style={ARM_STYLE}
      />
    </div>
  );
}
