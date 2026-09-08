import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useScanStore } from "../storage/scan-store";
import { relativeDate } from "../utils/format";
import { CORE_CATEGORY_META } from "../utils/categories";
import { ROUTES } from "../navigation/routes";

export function ProgressScreen() {
  const navigate = useNavigate();
  const { scans, latest, previous } = useScanStore();

  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-16 text-center">
        <span className="text-3xl">📈</span>
        <p className="text-[14.5px] text-ink-soft">Your scan history will show up here once you run your first scan.</p>
        <Button onClick={() => navigate(ROUTES.upload)}>Get My Glow-Up</Button>
      </div>
    );
  }

  const curr = latest()!;
  const prev = previous();
  const delta = prev ? curr.result.overallScore - prev.result.overallScore : null;

  return (
    <div className="px-6 pb-8 pt-6">
      <h1 className="font-display text-[24px] font-medium text-ink">Progress</h1>

      <Card className="mt-5">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="font-display text-3xl font-medium text-ink">{curr.result.overallScore}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft">Current</p>
          </div>
          {prev && (
            <>
              <span className="text-xl text-ink-soft/40">→</span>
              <div>
                <p className="font-display text-3xl font-medium text-ink-soft/50">{prev.result.overallScore}</p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft">Previous</p>
              </div>
            </>
          )}
        </div>
        {delta !== null && (
          <p
            className={[
              "mt-4 text-center text-[13.5px] font-semibold",
              delta > 0 ? "text-sage" : delta < 0 ? "text-blush-deep" : "text-ink-soft",
            ].join(" ")}
          >
            {delta > 0 ? `▲ +${delta} since last scan` : delta < 0 ? `▼ ${delta} since last scan` : "No change since last scan"}
          </p>
        )}
      </Card>

      {prev && (
        <>
          <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Improvement areas</h2>
          <div className="flex flex-col gap-2.5">
            {(Object.keys(CORE_CATEGORY_META) as (keyof typeof CORE_CATEGORY_META)[]).map((key) => {
              const currScore = curr.result.categories[key].score;
              const prevScore = prev.result.categories[key].score;
              const diff = currScore - prevScore;
              if (diff === 0) return null;
              return (
                <div key={key} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-[0_2px_16px_rgba(43,35,31,0.05)] ring-1 ring-black/[0.03]">
                  <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                    <span>{CORE_CATEGORY_META[key].icon}</span> {CORE_CATEGORY_META[key].label}
                  </span>
                  <span className={diff > 0 ? "text-[13px] font-semibold text-sage" : "text-[13px] font-semibold text-blush-deep"}>
                    {diff > 0 ? `+${diff}` : diff}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Scan history</h2>
      <div className="flex flex-col gap-2.5">
        {scans.map((s) => (
          <button
            key={s.result.id}
            onClick={() => navigate(`${ROUTES.results}?scan=${s.result.id}`)}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-[0_2px_16px_rgba(43,35,31,0.05)] ring-1 ring-black/[0.03] active:scale-[0.99]"
          >
            <img src={s.photoDataUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold text-ink">Overall score {s.result.overallScore}</p>
              <p className="text-[12px] text-ink-soft">{relativeDate(s.result.createdAt)}</p>
            </div>
            <span className="text-ink-soft/50">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
