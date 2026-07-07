import type { Metadata } from "next";
import { AnalyzeWorkspace } from "./analyze-workspace";

export const metadata: Metadata = {
  title: "Analyze a creative — Verdict",
  description:
    "Upload a static Meta ad creative and campaign context to get a Verdict.",
};

export default function AnalyzePage() {
  return <AnalyzeWorkspace />;
}
