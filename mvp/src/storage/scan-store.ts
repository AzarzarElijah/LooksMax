import { create } from "zustand";
import type { AnalysisResult } from "../ai/types";
import { readJSON, writeJSON, STORAGE_KEYS } from "./local-store";

export interface ScanRecord {
  result: AnalysisResult;
  photoDataUrl: string;
}

const MAX_HISTORY = 12;

interface ScanState {
  scans: ScanRecord[]; // newest first
  /** photo captured but not yet analyzed — kept in memory only, not persisted */
  draftPhoto: string | null;

  setDraftPhoto: (dataUrl: string | null) => void;
  addScan: (record: ScanRecord) => void;
  clearHistory: () => void;
  latest: () => ScanRecord | null;
  previous: () => ScanRecord | null; // the one before latest, for progress deltas
}

const initialScans = readJSON<ScanRecord[]>(STORAGE_KEYS.scans, []);

function persist(scans: ScanRecord[]) {
  writeJSON(STORAGE_KEYS.scans, scans.slice(0, MAX_HISTORY));
}

export const useScanStore = create<ScanState>((set, get) => ({
  scans: initialScans,
  draftPhoto: null,

  setDraftPhoto: (dataUrl) => set({ draftPhoto: dataUrl }),

  addScan: (record) => {
    const scans = [record, ...get().scans].slice(0, MAX_HISTORY);
    set({ scans, draftPhoto: null });
    persist(scans);
  },

  clearHistory: () => {
    set({ scans: [] });
    persist([]);
  },

  latest: () => get().scans[0] ?? null,
  previous: () => get().scans[1] ?? null,
}));

export function findScanById(scans: ScanRecord[], id: string): ScanRecord | null {
  return scans.find((s) => s.result.id === id) ?? null;
}
