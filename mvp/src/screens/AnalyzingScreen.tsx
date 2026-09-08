import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { Button } from "../components/ui/Button";
import { useScanStore } from "../storage/scan-store";
import { useOnboardingStore } from "../storage/onboarding-store";
import { getAnalysisProvider, isDemoMode } from "../ai/provider";
import type { AnalysisStage } from "../ai/types";
import { AnalysisError } from "../ai/types";
import { ROUTES } from "../navigation/routes";

const STAGE_COPY: Record<AnalysisStage, string> = {
  analyzing_features: "Analyzing your features…",
  finding_colors: "Finding your best colors…",
  identifying_strengths: "Identifying your strongest areas…",
  building_plan: "Building your personalized glow-up plan…",
};

const STAGE_ORDER: AnalysisStage[] = [
  "analyzing_features",
  "finding_colors",
  "identifying_strengths",
  "building_plan",
];

export function AnalyzingScreen() {
  const navigate = useNavigate();
  const { draftPhoto, addScan } = useScanStore();
  const { ageGroup, goals, stylePreferences } = useOnboardingStore();
  const [stage, setStage] = useState<AnalysisStage>("analyzing_features");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!draftPhoto || !ageGroup) {
      navigate(ROUTES.upload, { replace: true });
      return;
    }
    setError(null);
    setStage("analyzing_features");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const provider = getAnalysisProvider();
      const result = await provider.analyze(
        { photoDataUrl: draftPhoto, profile: { ageGroup, goals, stylePreferences } },
        { onStage: setStage, signal: controller.signal },
      );
      addScan({ result, photoDataUrl: draftPhoto });
      navigate(ROUTES.results, { replace: true });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof AnalysisError
          ? err.message
          : "Something went wrong while analyzing your photo. Try again.",
      );
    }
  }, [draftPhoto, ageGroup, goals, stylePreferences, addScan, navigate]);

  useEffect(() => {
    runAnalysis();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const stageIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      {!error ? (
        <>
          <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-blush-light border-t-blush-deep" />
            <span className="text-4xl">✨</span>
          </div>
          <h1 className="font-display text-[22px] font-medium text-ink">{STAGE_COPY[stage]}</h1>
          <div className="mt-6 flex gap-1.5">
            {STAGE_ORDER.map((s, i) => (
              <div
                key={s}
                className={[
                  "h-1.5 w-8 rounded-full transition-colors",
                  i <= stageIndex ? "bg-blush-deep" : "bg-cream-deep",
                ].join(" ")}
              />
            ))}
          </div>
          {isDemoMode() && (
            <p className="mt-8 text-[11px] uppercase tracking-wide text-ink-soft/60">Demo mode — no API key configured</p>
          )}
        </>
      ) : (
        <div className="w-full">
          <ErrorBanner message={error} onRetry={() => setAttempt((a) => a + 1)} />
          <div className="mt-4">
            <Button variant="ghost" onClick={() => navigate(ROUTES.upload)}>
              Choose a different photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
