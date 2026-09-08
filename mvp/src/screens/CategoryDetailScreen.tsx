import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { Card } from "../components/ui/Card";
import { ScoreRing } from "../components/ui/ScoreRing";
import { Button } from "../components/ui/Button";
import { useScanStore, findScanById } from "../storage/scan-store";
import { CORE_CATEGORY_META, isCoreCategoryKey } from "../utils/categories";
import { productsForCategory } from "../data/mock-products";
import { ProductCard } from "../components/ProductCard";
import { ROUTES } from "../navigation/routes";

export function CategoryDetailScreen() {
  const navigate = useNavigate();
  const { category = "" } = useParams();
  const [params] = useSearchParams();
  const { scans, latest } = useScanStore();

  const scanId = params.get("scan");
  const record = scanId ? findScanById(scans, scanId) : latest();

  useEffect(() => {
    if (!record) navigate(ROUTES.upload, { replace: true });
  }, [record, navigate]);

  if (!record) return null;

  const { result } = record;
  const products = productsForCategory(category);

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <ScreenHeader title={titleFor(category)} onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-2">
        {isCoreCategoryKey(category) ? (
          <CoreDetail category={category} result={result} />
        ) : category === "makeup" ? (
          <MakeupDetail result={result} />
        ) : category === "colors" ? (
          <ColorsDetail result={result} />
        ) : category === "style" ? (
          <StyleDetail result={result} />
        ) : (
          <p className="text-ink-soft">Category not found.</p>
        )}

        {products.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 font-display text-[17px] font-medium text-ink">Recommended for you</h2>
            <div className="flex flex-col gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <Button variant="outline" onClick={() => navigate(ROUTES.plan)}>
            View full glow-up plan
          </Button>
        </div>
      </div>
    </div>
  );
}

function titleFor(category: string) {
  if (isCoreCategoryKey(category)) return CORE_CATEGORY_META[category].label;
  return { makeup: "Makeup", colors: "Your Colors", style: "Style" }[category] ?? "Details";
}

function CoreDetail({
  category,
  result,
}: {
  category: keyof typeof CORE_CATEGORY_META;
  result: import("../ai/types").AnalysisResult;
}) {
  const cat = result.categories[category];
  return (
    <>
      <div className="flex items-center gap-4">
        <ScoreRing score={cat.score} size={84} strokeWidth={7} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blush-deep">
            {CORE_CATEGORY_META[category].label}
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{cat.observations}</p>
        </div>
      </div>

      <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">What works for you</h3>
      <div className="flex flex-col gap-2.5">
        {cat.recommendations.map((rec, i) => (
          <Card key={i} className="!p-4">
            <p className="text-[14px] leading-relaxed text-ink">{rec}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

function MakeupDetail({ result }: { result: import("../ai/types").AnalysisResult }) {
  const { makeup } = result;
  return (
    <>
      <div className="flex items-center gap-4">
        <ScoreRing score={makeup.applicabilityScore} size={84} strokeWidth={7} label="fit" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blush-deep">Recommended style</p>
          <p className="mt-1 font-display text-[19px] font-medium text-ink">{makeup.recommendedStyle}</p>
        </div>
      </div>
      <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Look guide</h3>
      <div className="flex flex-col gap-2.5">
        {makeup.recommendations.map((rec, i) => (
          <Card key={i} className="!p-4">
            <p className="text-[14px] leading-relaxed text-ink">{rec}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

function ColorsDetail({ result }: { result: import("../ai/types").AnalysisResult }) {
  const { colors } = result;
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blush-deep">Your palette</p>
      <p className="mt-1 font-display text-[19px] font-medium text-ink">{colors.paletteName}</p>
      <div className="mt-4 flex gap-2">
        {colors.palette.map((hex) => (
          <div key={hex} className="flex-1">
            <div className="aspect-square rounded-xl shadow-inner" style={{ backgroundColor: hex }} />
            <p className="mt-1 text-center text-[10px] uppercase text-ink-soft">{hex}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Prioritize</h3>
      <div className="flex flex-wrap gap-2">
        {colors.prioritize.map((c) => (
          <span key={c} className="rounded-full bg-blush-light px-3 py-1.5 text-[13px] font-medium text-blush-deep">
            {c}
          </span>
        ))}
      </div>

      <h3 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Minimize</h3>
      <div className="flex flex-wrap gap-2">
        {colors.minimize.map((c) => (
          <span key={c} className="rounded-full bg-cream-deep px-3 py-1.5 text-[13px] font-medium text-ink-soft">
            {c}
          </span>
        ))}
      </div>
    </>
  );
}

function StyleDetail({ result }: { result: import("../ai/types").AnalysisResult }) {
  const { style } = result;
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blush-deep">Recommended aesthetic</p>
      <p className="mt-1 font-display text-[19px] font-medium text-ink">{style.recommendedAesthetic}</p>
      <div className="mt-6 flex flex-col gap-2.5">
        {style.suggestions.map((s, i) => (
          <Card key={i} className="!p-4">
            <p className="text-[14px] leading-relaxed text-ink">{s}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
