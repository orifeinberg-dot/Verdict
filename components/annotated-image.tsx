"use client";

import { Fragment } from "react";
import type { AnnotatedPoint, BoundingBox, Weakness } from "@/lib/verdict/types";
import { resolveMarkerLayout } from "@/lib/verdict/marker-layout";

type Kind = "strength" | "weakness";

type Marker = {
  id: string;
  kind: Kind;
  box: BoundingBox;
  summary: string;
};

function hasBoundingBox<T extends { boundingBox?: BoundingBox }>(
  point: T,
): point is T & { boundingBox: BoundingBox } {
  return point.boundingBox !== undefined;
}

type Props = {
  image: { dataUrl: string; width: number; height: number };
  strengths: AnnotatedPoint[];
  weaknesses: Weakness[];
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

// Renders the creative at its natural aspect ratio with strength/weakness
// markers positioned from percentage-based bounding boxes (UI_SPEC.md's
// "Visual annotation design"). Only strengths and weaknesses ever get a
// marker — recommendations are never annotated on the image.
export function AnnotatedImage({
  image,
  strengths,
  weaknesses,
  activeId,
  onHover,
  onSelect,
}: Props) {
  const markers: Marker[] = [
    ...strengths.filter(hasBoundingBox).map((point) => ({
      id: point.id,
      kind: "strength" as const,
      box: point.boundingBox,
      summary: point.summary,
    })),
    ...weaknesses.filter(hasBoundingBox).map((point) => ({
      id: point.id,
      kind: "weakness" as const,
      box: point.boundingBox,
      summary: point.summary,
    })),
  ];

  // Collision avoidance only ever nudges where the marker dot renders —
  // the bounding box outline below always stays at its original
  // coordinates. See lib/verdict/marker-layout.ts.
  const resolvedPositions = resolveMarkerLayout(
    markers.map((marker) => ({
      id: marker.id,
      centerXPercent: marker.box.x + marker.box.width / 2,
      centerYPercent: marker.box.y + marker.box.height / 2,
    })),
    image.width,
    image.height,
  );
  const positionById = new Map(resolvedPositions.map((position) => [position.id, position]));

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-foreground/10"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.dataUrl}
        alt="Uploaded creative"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Connectors for markers displaced by collision avoidance, drawn in
          the image's own pixel space so they stay a true straight line
          regardless of the creative's aspect ratio. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${image.width} ${image.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {markers.map((marker) => {
          const position = positionById.get(marker.id)!;
          if (!position.displaced) return null;
          const x1 = (marker.box.x + marker.box.width / 2) * (image.width / 100);
          const y1 = (marker.box.y + marker.box.height / 2) * (image.height / 100);
          const x2 = (position.xPercent / 100) * image.width;
          const y2 = (position.yPercent / 100) * image.height;

          // Stop short of the marker dot's visible edge — a line that runs
          // straight into the dot's center reads as cramped rather than a
          // clean stand-off.
          const dx = x2 - x1;
          const dy = y2 - y1;
          const distance = Math.hypot(dx, dy);
          const GAP_PX = 16;
          const trimmedDistance = Math.max(distance - GAP_PX, distance * 0.4);
          const t = distance === 0 ? 0 : trimmedDistance / distance;
          const endX = x1 + dx * t;
          const endY = y1 + dy * t;

          return (
            <line
              key={marker.id}
              x1={x1}
              y1={y1}
              x2={endX}
              y2={endY}
              className="stroke-foreground/40"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          );
        })}
      </svg>
      {markers.map((marker) => {
        const isActive = marker.id === activeId;
        const position = positionById.get(marker.id)!;
        const dotClass =
          marker.kind === "strength" ? "bg-marker-strength" : "bg-marker-weakness";
        const outlineClass =
          marker.kind === "strength" ? "border-marker-strength" : "border-marker-weakness";
        const fillClass =
          marker.kind === "strength" ? "bg-marker-strength/10" : "bg-marker-weakness/10";
        const kindLabel = marker.kind === "strength" ? "Strength" : "Weakness";

        return (
          <Fragment key={marker.id}>
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute rounded-md border-2 transition-opacity duration-200 ${outlineClass} ${fillClass} ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
              style={{
                left: `${marker.box.x}%`,
                top: `${marker.box.y}%`,
                width: `${marker.box.width}%`,
                height: `${marker.box.height}%`,
              }}
            />
            <button
              type="button"
              aria-label={`${kindLabel}: ${marker.summary}`}
              aria-pressed={isActive}
              onMouseEnter={() => onHover(marker.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(marker.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(marker.id)}
              className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ left: `${position.xPercent}%`, top: `${position.yPercent}%` }}
            >
              <span
                aria-hidden="true"
                className={`block h-6 w-6 rounded-full shadow-md transition-transform duration-150 ${dotClass} ${
                  isActive ? "scale-125" : "scale-100"
                }`}
              />
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
