"use client";

import { Fragment } from "react";
import type { AnnotatedPoint, BoundingBox, Weakness } from "@/lib/verdict/types";

type Kind = "strength" | "weakness";

type Marker = {
  id: string;
  kind: Kind;
  box: BoundingBox;
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
    })),
    ...weaknesses.filter(hasBoundingBox).map((point) => ({
      id: point.id,
      kind: "weakness" as const,
      box: point.boundingBox,
    })),
  ];

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
      {markers.map((marker) => {
        const isActive = marker.id === activeId;
        const centerX = marker.box.x + marker.box.width / 2;
        const centerY = marker.box.y + marker.box.height / 2;
        const dotClass =
          marker.kind === "strength" ? "bg-marker-strength" : "bg-marker-weakness";
        const outlineClass =
          marker.kind === "strength" ? "border-marker-strength" : "border-marker-weakness";

        return (
          <Fragment key={marker.id}>
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute rounded-md border-2 transition-opacity duration-200 ${outlineClass} ${
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
              aria-label={`${marker.kind === "strength" ? "Strength" : "Weakness"} highlight`}
              aria-pressed={isActive}
              onMouseEnter={() => onHover(marker.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(marker.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(marker.id)}
              className={`absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${dotClass} ${
                isActive ? "scale-125" : "scale-100"
              }`}
              style={{ left: `${centerX}%`, top: `${centerY}%` }}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
