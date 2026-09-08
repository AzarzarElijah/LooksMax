import type { AnalysisResult, CategoryAnalysis } from "../ai/types";

export type CoreCategoryKey = "skin" | "hair" | "face" | "eyes" | "brows" | "lips";

export const CORE_CATEGORY_META: Record<CoreCategoryKey, { label: string; icon: string }> = {
  skin: { label: "Skin", icon: "✨" },
  hair: { label: "Hair", icon: "💇‍♀️" },
  face: { label: "Face", icon: "🙂" },
  eyes: { label: "Eyes", icon: "👁️" },
  brows: { label: "Brows", icon: "🤨" },
  lips: { label: "Lips", icon: "💋" },
};

export const CORE_CATEGORY_KEYS = Object.keys(CORE_CATEGORY_META) as CoreCategoryKey[];

export function getCoreCategory(result: AnalysisResult, key: CoreCategoryKey): CategoryAnalysis {
  return result.categories[key];
}

export function isCoreCategoryKey(key: string): key is CoreCategoryKey {
  return (CORE_CATEGORY_KEYS as string[]).includes(key);
}
