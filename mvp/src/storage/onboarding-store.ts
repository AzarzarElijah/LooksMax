import { create } from "zustand";
import type { AgeGroup, BeautyGoal, StylePreference } from "../ai/types";
import { readJSON, writeJSON, STORAGE_KEYS } from "./local-store";

interface OnboardingState {
  ageGroup: AgeGroup | null;
  underAgeBlocked: boolean; // true if the user entered an age under 13
  goals: BeautyGoal[];
  stylePreferences: StylePreference[];
  completed: boolean;

  setAge: (age: number) => void;
  toggleGoal: (goal: BeautyGoal) => void;
  toggleStyle: (style: StylePreference) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

interface PersistedOnboarding {
  ageGroup: AgeGroup | null;
  goals: BeautyGoal[];
  stylePreferences: StylePreference[];
  completed: boolean;
}

const initial = readJSON<PersistedOnboarding>(STORAGE_KEYS.onboarding, {
  ageGroup: null,
  goals: [],
  stylePreferences: [],
  completed: false,
});

function persist(state: OnboardingState) {
  writeJSON<PersistedOnboarding>(STORAGE_KEYS.onboarding, {
    ageGroup: state.ageGroup,
    goals: state.goals,
    stylePreferences: state.stylePreferences,
    completed: state.completed,
  });
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ageGroup: initial.ageGroup,
  underAgeBlocked: false,
  goals: initial.goals,
  stylePreferences: initial.stylePreferences,
  completed: initial.completed,

  setAge: (age) => {
    if (age < 13) {
      set({ underAgeBlocked: true, ageGroup: null });
      return;
    }
    const ageGroup: AgeGroup = age <= 17 ? "13-17" : "18+";
    set({ ageGroup, underAgeBlocked: false });
    persist(get());
  },

  toggleGoal: (goal) => {
    const goals = get().goals.includes(goal)
      ? get().goals.filter((g) => g !== goal)
      : [...get().goals, goal];
    set({ goals });
    persist(get());
  },

  toggleStyle: (style) => {
    const stylePreferences = get().stylePreferences.includes(style)
      ? get().stylePreferences.filter((s) => s !== style)
      : [...get().stylePreferences, style];
    set({ stylePreferences });
    persist(get());
  },

  completeOnboarding: () => {
    set({ completed: true });
    persist(get());
  },

  reset: () => {
    set({ ageGroup: null, underAgeBlocked: false, goals: [], stylePreferences: [], completed: false });
    persist(get());
  },
}));
