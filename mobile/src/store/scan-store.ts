import { create } from 'zustand';

// Transient state for the capture -> confirm -> results flow (§13.1/§13.2). Lives only for the
// duration of one in-progress scan; reset() is called once results are shown or the flow is
// abandoned. Deliberately not persisted — a half-finished scan shouldn't survive an app restart.
interface ScanState {
  photoUri: string | null;
  makeupOn: boolean | null;
  setPhoto: (uri: string) => void;
  setMakeupOn: (value: boolean) => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  photoUri: null,
  makeupOn: null,
  setPhoto: (uri) => set({ photoUri: uri, makeupOn: null }),
  setMakeupOn: (value) => set({ makeupOn: value }),
  reset: () => set({ photoUri: null, makeupOn: null }),
}));
