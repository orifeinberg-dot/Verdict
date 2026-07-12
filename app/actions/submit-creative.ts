"use server";

import { verdictEngine } from "@/lib/verdict";
import type { CreativeContext, CreativeImage, VerdictReport } from "@/lib/verdict/types";

export type SubmitCreativeResult =
  | { status: "success"; report: VerdictReport }
  | { status: "error"; message: string };

export async function submitCreative(
  image: CreativeImage,
  context: CreativeContext,
): Promise<SubmitCreativeResult> {
  if (!image?.dataUrl || !image.width || !image.height) {
    return {
      status: "error",
      message: "The uploaded image is missing or unreadable. Try uploading it again.",
    };
  }

  if (
    !context?.brandName ||
    !context.industry ||
    !context.campaignObjective ||
    !context.campaignType
  ) {
    return {
      status: "error",
      message:
        "Some required fields are missing — fill in Brand, Industry, Campaign objective, and Campaign type.",
    };
  }

  try {
    const report = await verdictEngine.analyze(image, context);
    return { status: "success", report };
  } catch {
    return {
      status: "error",
      message: "We couldn't generate a Verdict for this creative. Try again in a moment.",
    };
  }
}
