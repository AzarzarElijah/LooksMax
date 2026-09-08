import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { StepDots } from "../../components/ui/StepDots";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { useOnboardingStore } from "../../storage/onboarding-store";
import { ROUTES } from "../../navigation/routes";
import type { BeautyGoal } from "../../ai/types";

const GOALS: { key: BeautyGoal; label: string; icon: string }[] = [
  { key: "better_skin", label: "Better skin", icon: "✨" },
  { key: "better_hair", label: "Better hair", icon: "💇‍♀️" },
  { key: "better_makeup", label: "Better makeup", icon: "💄" },
  { key: "more_feminine", label: "Look more feminine", icon: "🌸" },
  { key: "more_polished", label: "Look more polished", icon: "🪞" },
  { key: "facial_appearance", label: "Improve facial appearance", icon: "🙂" },
  { key: "best_colors", label: "Find my best colors", icon: "🎨" },
  { key: "overall_appearance", label: "Improve overall appearance", icon: "🌟" },
];

export function GoalsScreen() {
  const navigate = useNavigate();
  const { goals, toggleGoal } = useOnboardingStore();

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <ScreenHeader />
      <StepDots step={2} total={3} />
      <div className="flex-1 overflow-y-auto px-6 pt-4">
        <h1 className="font-display text-[26px] font-medium text-ink">What are your beauty goals?</h1>
        <p className="mt-2 text-[14px] text-ink-soft">Pick as many as apply.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {GOALS.map((g) => (
            <Chip key={g.key} selected={goals.includes(g.key)} onClick={() => toggleGoal(g.key)} icon={g.icon}>
              {g.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="px-6 pb-10 pt-4">
        <Button onClick={() => navigate(ROUTES.onboardingStyle)} disabled={goals.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
