import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useScanStore } from "../storage/scan-store";
import { MOCK_PRODUCTS } from "../data/mock-products";
import { ProductCard } from "../components/ProductCard";
import { difficultyLabel, impactLabel } from "../utils/format";
import { ROUTES } from "../navigation/routes";

export function PlanScreen() {
  const navigate = useNavigate();
  const { latest } = useScanStore();
  const record = latest();

  if (!record) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-16 text-center">
        <span className="text-3xl">📋</span>
        <p className="text-[14.5px] text-ink-soft">Take your first scan to get a personalized plan.</p>
        <Button onClick={() => navigate(ROUTES.upload)}>Get My Glow-Up</Button>
      </div>
    );
  }

  const { result } = record;
  const dailyItem = result.categories.skin.recommendations[0];
  const dailyHair = result.categories.hair.recommendations[0];
  const weeklyItem = result.categories.hair.recommendations[1] ?? "A weekly self-care reset — mask, deep condition, or rest.";
  const optionalMakeup = result.makeup.recommendations[0];
  const optionalStyle = result.style.suggestions[0];

  return (
    <div className="px-6 pb-8 pt-6">
      <h1 className="font-display text-[24px] font-medium text-ink">Your Glow-Up Plan</h1>
      <p className="mt-1.5 text-[14px] text-ink-soft">Prioritized by expected impact.</p>

      <h2 className="mb-3 mt-6 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Start here</h2>
      <div className="flex flex-col gap-3">
        {result.priorityPlan.map((item, i) => (
          <Card key={item.area} className="!p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blush-light font-display text-[13px] font-semibold text-blush-deep">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">{item.area}</p>
                <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-soft">{item.change}</p>
                <p className="mt-1.5 text-[12px] italic text-ink-soft/80">Why: {item.why}</p>
                <div className="mt-2 flex gap-2">
                  <span className="rounded-full bg-cream-deep px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                    {difficultyLabel(item.difficulty)}
                  </span>
                  <span className="rounded-full bg-sage/15 px-2.5 py-1 text-[11px] font-medium text-sage">
                    {impactLabel(item.expectedImpact)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Daily</h2>
      <Card className="flex flex-col gap-2 !p-4">
        <PlanRow icon="✨" text={dailyItem} />
        <PlanRow icon="💇‍♀️" text={dailyHair} />
      </Card>

      <h2 className="mb-3 mt-6 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Weekly</h2>
      <Card className="flex flex-col gap-2 !p-4">
        <PlanRow icon="🧖‍♀️" text={weeklyItem} />
      </Card>

      <h2 className="mb-3 mt-6 text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Optional upgrades</h2>
      <Card className="flex flex-col gap-2 !p-4">
        <PlanRow icon="💄" text={optionalMakeup} />
        <PlanRow icon="👗" text={optionalStyle} />
      </Card>

      <h2 className="mb-3 mt-8 font-display text-[17px] font-medium text-ink">Recommended products</h2>
      <div className="flex flex-col gap-3">
        {MOCK_PRODUCTS.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function PlanRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[15px]">{icon}</span>
      <p className="text-[13.5px] leading-relaxed text-ink">{text}</p>
    </div>
  );
}
