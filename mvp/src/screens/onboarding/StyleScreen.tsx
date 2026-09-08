import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { StepDots } from "../../components/ui/StepDots";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { useOnboardingStore } from "../../storage/onboarding-store";
import { ROUTES } from "../../navigation/routes";
import type { StylePreference } from "../../ai/types";

const STYLES: { key: StylePreference; label: string; icon: string }[] = [
  { key: "natural", label: "Natural", icon: "🌿" },
  { key: "clean_girl", label: "Clean girl", icon: "🤍" },
  { key: "glam", label: "Glam", icon: "💎" },
  { key: "soft", label: "Soft", icon: "☁️" },
  { key: "feminine", label: "Feminine", icon: "🌸" },
  { key: "minimal", label: "Minimal", icon: "◽" },
  { key: "trendy", label: "Trendy", icon: "🔥" },
];

export function StyleScreen() {
  const navigate = useNavigate();
  const { stylePreferences, toggleStyle, completeOnboarding } = useOnboardingStore();

  function handleFinish() {
    completeOnboarding();
    navigate(ROUTES.upload);
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <ScreenHeader />
      <StepDots step={3} total={3} />
      <div className="flex-1 overflow-y-auto px-6 pt-4">
        <h1 className="font-display text-[26px] font-medium text-ink">What's your current style?</h1>
        <p className="mt-2 text-[14px] text-ink-soft">This helps us tailor your recommendations.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {STYLES.map((s) => (
            <Chip
              key={s.key}
              selected={stylePreferences.includes(s.key)}
              onClick={() => toggleStyle(s.key)}
              icon={s.icon}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="px-6 pb-10 pt-4">
        <Button onClick={handleFinish} disabled={stylePreferences.length === 0}>
          Continue to my photo
        </Button>
      </div>
    </div>
  );
}
