// Shared contract for the analysis AI. The UI only ever talks to `AnalysisProvider`
// (see provider.ts) — it never knows or cares whether a real model or the mock
// provider produced the result.

export type AgeGroup = "13-17" | "18+";

export type BeautyGoal =
  | "better_skin"
  | "better_hair"
  | "better_makeup"
  | "more_feminine"
  | "more_polished"
  | "facial_appearance"
  | "best_colors"
  | "overall_appearance";

export type StylePreference =
  | "natural"
  | "clean_girl"
  | "glam"
  | "soft"
  | "feminine"
  | "minimal"
  | "trendy";

export interface OnboardingProfile {
  ageGroup: AgeGroup;
  goals: BeautyGoal[];
  stylePreferences: StylePreference[];
}

export interface AnalysisInput {
  /** data: URL of the selfie, kept local to the device — never uploaded anywhere by the mock provider. */
  photoDataUrl: string;
  profile: OnboardingProfile;
}

export interface CategoryAnalysis {
  score: number; // 0-100, encouraging scale — see ai/provider.ts doc comment
  observations: string;
  recommendations: string[];
}

export interface MakeupAnalysis {
  applicabilityScore: number;
  recommendedStyle: string;
  recommendations: string[];
}

export interface ColorAnalysis {
  paletteName: string;
  /** hex codes for a small "your palette" swatch strip */
  palette: string[];
  prioritize: string[];
  minimize: string[];
}

export interface StyleAnalysis {
  recommendedAesthetic: string;
  suggestions: string[];
}

export type PriorityDifficulty = "easy" | "moderate" | "involved";
export type PriorityImpact = "low" | "medium" | "high";

export interface PriorityPlanItem {
  area: string;
  change: string;
  why: string;
  difficulty: PriorityDifficulty;
  expectedImpact: PriorityImpact;
}

export interface AnalysisResult {
  id: string;
  createdAt: string; // ISO timestamp
  overallScore: number;
  summary: string;
  topOpportunities: string[]; // top 3, short phrases
  categories: {
    skin: CategoryAnalysis;
    hair: CategoryAnalysis;
    face: CategoryAnalysis;
    eyes: CategoryAnalysis;
    brows: CategoryAnalysis;
    lips: CategoryAnalysis;
  };
  makeup: MakeupAnalysis;
  colors: ColorAnalysis;
  style: StyleAnalysis;
  priorityPlan: PriorityPlanItem[]; // exactly 3, highest impact first
  /** which provider produced this, surfaced in dev/demo UI only */
  providerId: "mock" | "openai";
}

export type AnalysisStage =
  | "analyzing_features"
  | "finding_colors"
  | "identifying_strengths"
  | "building_plan";

export interface AnalyzeOptions {
  onStage?: (stage: AnalysisStage) => void;
  signal?: AbortSignal;
}

export class AnalysisError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AnalysisError";
    this.cause = cause;
  }
}
