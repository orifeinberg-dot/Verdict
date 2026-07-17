import type {
  CreativeContext,
  StoredCampaignType,
  VerdictReport,
} from "@/lib/verdict/types";

// Loaded context may carry a retired Campaign Type value from before the
// taxonomy simplification — see StoredCampaignType in lib/verdict/types.ts.
export type StoredCreativeContext = Omit<CreativeContext, "campaignType"> & {
  campaignType: StoredCampaignType;
};

export type StoredReport = {
  report: VerdictReport;
  image: { dataUrl: string; width: number; height: number };
  context: StoredCreativeContext;
};

export interface ReportStore {
  save(entry: StoredReport): string;
  load(id: string): StoredReport | null;
}
