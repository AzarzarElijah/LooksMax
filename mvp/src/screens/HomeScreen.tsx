import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ScoreRing } from "../components/ui/ScoreRing";
import { useScanStore } from "../storage/scan-store";
import { usePremiumStore } from "../storage/premium-store";
import { CORE_CATEGORY_META } from "../utils/categories";
import { scoreLabel } from "../utils/format";
import { ROUTES } from "../navigation/routes";

export function HomeScreen() {
  const navigate = useNavigate();
  const { latest } = useScanStore();
  const { unlocked } = usePremiumStore();
  const record = latest();

  return (
    <div className="px-6 pb-6 pt-6">
      <p className="text-[13px] font-medium text-ink-soft">Welcome back</p>
      <h1 className="font-display text-[24px] font-medium text-ink">Your Glow-Up Status</h1>

      {!record ? (
        <Card className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
          <span className="text-3xl">✨</span>
          <p className="text-[14.5px] leading-relaxed text-ink-soft">
            You haven't taken your first scan yet. Upload a selfie to get your personalized
            glow-up analysis.
          </p>
          <Button onClick={() => navigate(ROUTES.upload)}>Get My Glow-Up</Button>
        </Card>
      ) : (
        <>
          <Card className="mt-6 flex items-center gap-4">
            <ScoreRing score={record.result.overallScore} size={92} strokeWidth={8} />
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blush-deep">
                {scoreLabel(record.result.overallScore)}
              </p>
              <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">
                Biggest opportunity: <span className="font-semibold text-ink">{record.result.topOpportunities[0]}</span>
              </p>
              <button
                onClick={() => navigate(ROUTES.results)}
                className="mt-2 text-[12.5px] font-semibold text-blush-deep"
              >
                View full analysis →
              </button>
            </div>
          </Card>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {Object.entries(CORE_CATEGORY_META)
              .slice(0, 4)
              .map(([key, meta]) => {
                const score = record.result.categories[key as keyof typeof record.result.categories].score;
                return (
                  <div key={key} className="rounded-2xl bg-white p-3.5 shadow-[0_2px_16px_rgba(43,35,31,0.05)] ring-1 ring-black/[0.03]">
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{meta.icon}</span>
                      <span className="font-display text-[15px] font-medium text-ink">{score}</span>
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-ink-soft">{meta.label}</p>
                  </div>
                );
              })}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button variant="secondary" onClick={() => navigate(ROUTES.plan)}>
              View my glow-up plan
            </Button>
            <Button variant="outline" onClick={() => navigate(ROUTES.upload)}>
              Run a new scan
            </Button>
          </div>
        </>
      )}

      {!unlocked && (
        <button
          onClick={() => navigate(ROUTES.premium)}
          className="mt-6 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-ink to-ink/80 p-4 text-left text-white shadow-lg active:scale-[0.99]"
        >
          <div>
            <p className="text-[13px] font-semibold text-gold-light">Glow-Up Pro</p>
            <p className="text-[12px] text-white/70">Unlock deeper analysis &amp; unlimited scans</p>
          </div>
          <span className="text-lg">→</span>
        </button>
      )}
    </div>
  );
}
