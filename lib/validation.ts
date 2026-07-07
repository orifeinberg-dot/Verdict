export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Meta static ad placements this product targets; used only for the
// soft aspect-ratio warning, not to block anything.
const REFERENCE_ASPECT_RATIOS = [
  { label: "1:1", value: 1 / 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "9:16", value: 9 / 16 },
  { label: "1.91:1", value: 1.91 / 1 },
];
const ASPECT_RATIO_TOLERANCE = 0.08;

// Below this on the shorter side, an image is likely too small to review
// or to look sharp as an ad — still allowed, just flagged.
const MIN_RECOMMENDED_DIMENSION_PX = 500;

export type ImageValidationResult =
  | { status: "error"; message: string }
  | {
      status: "ok";
      warnings: string[];
      previewUrl: string;
      width: number;
      height: number;
    };

export async function validateImageFile(
  file: File
): Promise<ImageValidationResult> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return {
      status: "error",
      message: "We can only accept JPG, PNG, or WEBP files.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      status: "error",
      message:
        "That file is over 10MB — try compressing it or choosing a smaller image.",
    };
  }

  let dimensions: { previewUrl: string; width: number; height: number };
  try {
    dimensions = await readImageDimensions(file);
  } catch {
    return {
      status: "error",
      message:
        "We couldn't open that image — it may be corrupted. Try a different file.",
    };
  }

  const { previewUrl, width, height } = dimensions;
  const warnings: string[] = [];

  if (Math.min(width, height) < MIN_RECOMMENDED_DIMENSION_PX) {
    warnings.push(
      "This image is quite small, which may make it harder to review reliably."
    );
  }

  const ratio = width / height;
  const matchesReferenceRatio = REFERENCE_ASPECT_RATIOS.some(
    (reference) =>
      Math.abs(ratio - reference.value) / reference.value <
      ASPECT_RATIO_TOLERANCE
  );
  if (!matchesReferenceRatio) {
    warnings.push(
      "This aspect ratio is unusual for a static Meta ad (common shapes are 1:1, 4:5, 9:16, or 1.91:1)."
    );
  }

  return { status: "ok", warnings, previewUrl, width, height };
}

function readImageDimensions(
  file: File
): Promise<{ previewUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        previewUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("unreadable image"));
    };
    image.src = previewUrl;
  });
}
