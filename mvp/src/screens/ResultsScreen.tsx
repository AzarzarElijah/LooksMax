import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ScoreRing } from "../components/ui/ScoreRing";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { useScanStore, findScanById } from "../storage/scan-store";
import { CORE_CATEGORY_KEYS, CORE_CATEGORY_META } from "../utils/categories";
import { scoreLabel } from "../utils/format";
import { ROUTES } from "../navigation/routes";

export function ResultsScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { scans, latest } = useScanStore();

  const scanId = params.get("scan");
  const record = scanId ? findScanById(scans, scanId) : latest();

  if (!record) {
    return (
      <div className="app-shell flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[15px] text-ink-soft">No results yet — let's take your first scan.</p>
        <Button onClick={() => navigate(ROUTES.upload)}>Start my scan</Button>
      </div>
    );
  }

  const { result } = record;

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <ScreenHeader title="Your Glow-Up Analysis" showBack={!scanId} onBack={() => navigate(ROUTES.home)} />

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
        <div className="flex flex-col items-center pt-2 text-center">
          <ScoreRing score={result.overallScore} label={scoreLabel(result.overallScore)} size={140} />
          <p className="mt-5 max-w-[300px] text-[14.5px] leading-relaxed text-ink-soft">{result.summary}</p>
        </div>

        <Card className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blush-deep">Your biggest opportunity</p>
          <p className="mt-1.5 font-display text-[19px] font-medium text-ink">{result.topOpportunities[0]}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {result.topOpportunities.slice(1).map((op) => (
              <div key={op} className="flex items-center gap-2 text-[13.5px] text-ink-soft">
                <span className="h-1 w-1 rounded-full bg-ink-soft/50" />
                {op}
              </div>
            ))}
          </div>
        </Card>

        <h2 className="mb-3 mt-8 font-display text-[17px] font-medium text-ink">By category</h2>
        <div className="grid grid-cols-2 gap-3">
          {CORE_CATEGORY_KEYS.map((key) => {
            const cat = result.categories[key];
            const meta = CORE_CATEGORY_META[key];
            return (
              <button
                key={key}
                onClick={() => navigate(ROUTES.resultDetail(key, scanId ?? undefined))}
                className="flex flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left shadow-[0_2px_16px_rgba(43,35,31,0.05)] ring-1 ring-black/[0.03] transition active:scale-[0.98]"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xl">{meta.icon}</span>
                  <span className="font-display text-lg font-medium text-ink">{cat.score}</span>
                </div>
                <span className="text-[13px] font-semibold text-ink">{meta.label}</span>
                <span className="line-clamp-2 text-[11.5px] leading-snug text-ink-soft">{cat.observations}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(ROUTES.resultDetail("makeup", scanId ?? undefined))}
            className="rounded-2xl bg-white p-4 text-left shadow-[0_2px_16px_rgba(43,35,31,0.05)] ring-1 ring-black/[0.03] active:scale-[0.98]"
          >
            <span className="text-xl">💄</span>
            <p className="mt-1 text-[13px] font-semibold text-ink">Makeup</p>
            <p className="text-[11.5px] text-ink-soft">{result.makeup.recommendedStyle}</p>
          </button>
          <button
            onClick={() => navigate(ROUTES.resultDetail("colors", scanId ?? undefined))}
            className="rounded-2xl bg-white p-4 text-left shadow-[0_2px_16px_rgba(43,35,31,0.05)] ring-1 ring-black/[0.03] active:scale-[0.98]"
          >
            <span className="text-xl">🎨</span>
            <p className="mt-1 text-[13px] font-semibold text-ink">Colors</p>
            <p className="text-[11.5px] text-ink-soft">{result.colors.paletteName}</p>
          </button>
          <button
            onClick={() => navigate(ROUTES.resultDetail("style", scanId ?? undefined))}
            className="col-span-2 rounded-2xl bg-white p-4 text-left shadow-[0_2px_16px_rgba(43,35,31,0.05)] ring-1 ring-black/[0.03] active:scale-[0.98]"
          >
            <span className="text-xl">👗</span>
            <p className="mt-1 text-[13px] font-semibold text-ink">Style — {result.style.recommendedAesthetic}</p>
          </button>
        </div>

        {!scanId && (
          <div className="mt-8">
            <Button onClick={() => navigate(ROUTES.plan)}>See my glow-up plan</Button>
          </div>
        )}
      </div>
    </div>
  );
}
