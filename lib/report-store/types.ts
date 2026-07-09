import type { CreativeContext, VerdictReport } from "@/lib/verdict/types";

export type StoredReport = {
  report: VerdictReport;
  image: { dataUrl: string; width: number; height: number };
  context: CreativeContext;
};

export interface ReportStore {
  save(entry: StoredReport): string;
  load(id: string): StoredReport | null;
}
