import { create } from "zustand";
import { readJSON, writeJSON } from "./local-store";

const KEY = "premium_unlocked";

interface PremiumState {
  unlocked: boolean;
  unlock: () => void;
}

export const usePremiumStore = create<PremiumState>((set) => ({
  unlocked: readJSON<boolean>(KEY, false),
  unlock: () => {
    writeJSON(KEY, true);
    set({ unlocked: true });
  },
}));
