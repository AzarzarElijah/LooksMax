export const ROUTES = {
  welcome: "/",
  onboardingAge: "/onboarding/age",
  onboardingGoals: "/onboarding/goals",
  onboardingStyle: "/onboarding/style",
  upload: "/scan/upload",
  analyzing: "/scan/analyzing",
  results: "/scan/results",
  resultDetail: (category: string, scanId?: string) =>
    `/scan/results/${category}${scanId ? `?scan=${scanId}` : ""}`,
  home: "/app/home",
  plan: "/app/plan",
  progress: "/app/progress",
  premium: "/premium",
} as const;
