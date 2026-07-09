import type { ReportStore } from "./types";
import { sessionStorageReportStore } from "./session-storage-store";

// Mirrors lib/verdict/index.ts's engine-selection seam. A future
// database-backed implementation swaps in here without touching callers.
export const reportStore: ReportStore = sessionStorageReportStore;
