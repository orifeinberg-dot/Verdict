// Presentation-only collision avoidance for on-image markers. Bounding
// boxes (the data model) never move — only the marker dot's rendered
// position is nudged, and only far enough to clear a minimum separation.
// Pure function of its inputs (no randomness, no DOM reads), so layout is
// stable across rerenders and works the same whether the coordinates come
// from the mock engine or a future model. Distance/clamping math is done
// in pixel space (via the image's natural width/height) rather than raw
// percentages, since Verdict supports non-square creative formats where a
// percentage-space distance doesn't reflect the true on-screen distance.

export type MarkerPoint = {
  id: string;
  centerXPercent: number;
  centerYPercent: number;
};

export type ResolvedMarkerPosition = {
  id: string;
  xPercent: number;
  yPercent: number;
  // True when this marker was nudged away from its bounding box's center
  // to avoid a collision — callers use this to draw a connector back to
  // the original point.
  displaced: boolean;
};

// Matches the marker button's actual touch target (h-11 w-11 in
// annotated-image.tsx), not just the smaller visible dot — otherwise two
// "separated" dots can still have overlapping tap targets, making one
// marker unreachable by touch even though a mouse can hover it precisely.
const TOUCH_TARGET_DIAMETER_PX = 44;
const MIN_SEPARATION_PX = TOUCH_TARGET_DIAMETER_PX;
// Half the touch target, used so a nudged marker's tap target never clips
// the image edge (the container clips overflow).
const MARKER_RADIUS_PX = TOUCH_TARGET_DIAMETER_PX / 2;
const DISPLACEMENT_EPSILON_PERCENT = 0.5;

function clamp(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

export function resolveMarkerLayout(
  points: MarkerPoint[],
  imageWidth: number,
  imageHeight: number,
): ResolvedMarkerPosition[] {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return points.map((point) => ({
      id: point.id,
      xPercent: point.centerXPercent,
      yPercent: point.centerYPercent,
      displaced: false,
    }));
  }

  // Process in an order derived from id, not prop array order, so the
  // resulting layout doesn't depend on how the report happened to sort
  // strengths/weaknesses.
  const ordered = [...points].sort((a, b) => a.id.localeCompare(b.id));
  const placed = ordered.map((point) => ({
    id: point.id,
    x: (point.centerXPercent / 100) * imageWidth,
    y: (point.centerYPercent / 100) * imageHeight,
  }));

  const RELAXATION_PASSES = 4;
  for (let pass = 0; pass < RELAXATION_PASSES; pass++) {
    for (let i = 0; i < placed.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = placed[j];
        const b = placed[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= MIN_SEPARATION_PX) continue;

        // Coincident centers have no direction to push along — derive one
        // deterministically from the pair's position instead of picking
        // randomly.
        const angle = distance === 0 ? (i * 137.5 * Math.PI) / 180 : Math.atan2(dy, dx);
        const deficit = MIN_SEPARATION_PX - distance;
        // Only the later marker (by id order) moves, so earlier markers
        // already settled in this pass stay put.
        b.x += Math.cos(angle) * deficit;
        b.y += Math.sin(angle) * deficit;
      }
    }
  }

  for (const point of placed) {
    point.x = clamp(point.x, MARKER_RADIUS_PX, Math.max(imageWidth - MARKER_RADIUS_PX, MARKER_RADIUS_PX));
    point.y = clamp(point.y, MARKER_RADIUS_PX, Math.max(imageHeight - MARKER_RADIUS_PX, MARKER_RADIUS_PX));
  }

  const byId = new Map(placed.map((point) => [point.id, point]));

  return points.map((original) => {
    const resolved = byId.get(original.id)!;
    const xPercent = (resolved.x / imageWidth) * 100;
    const yPercent = (resolved.y / imageHeight) * 100;
    const displaced =
      Math.abs(xPercent - original.centerXPercent) > DISPLACEMENT_EPSILON_PERCENT ||
      Math.abs(yPercent - original.centerYPercent) > DISPLACEMENT_EPSILON_PERCENT;
    return { id: original.id, xPercent, yPercent, displaced };
  });
}
