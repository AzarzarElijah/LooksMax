import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ROUTES } from "../navigation/routes";
import { useOnboardingStore } from "../storage/onboarding-store";
import { useScanStore } from "../storage/scan-store";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { completed } = useOnboardingStore();
  const { scans } = useScanStore();

  // Returning users skip straight back into the app instead of re-onboarding.
  useEffect(() => {
    if (completed && scans.length > 0) navigate(ROUTES.home, { replace: true });
    else if (completed) navigate(ROUTES.upload, { replace: true });
  }, [completed, scans.length, navigate]);

  if (completed) return null;

  return (
    <div className="app-shell flex min-h-dvh flex-col justify-between overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, var(--color-blush-light) 0%, var(--color-cream) 70%)",
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-lg shadow-blush/20">
          ✨
        </div>
        <h1 className="font-display text-[34px] font-medium leading-[1.15] text-ink">
          Glow
        </h1>
        <p className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-ink-soft">
          Discover what works best for your features — a personalized glow-up plan built for you,
          in minutes.
        </p>

        <div className="mt-10 flex items-center gap-3 text-[13px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" /> AI-powered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blush" /> Private &amp; on your device
          </span>
        </div>
      </div>

      <div className="relative px-6 pb-10">
        <Button onClick={() => navigate(ROUTES.onboardingAge)}>Get My Glow-Up</Button>
        <p className="mt-4 px-4 text-center text-[11px] leading-relaxed text-ink-soft/70">
          This is a prototype. Analysis is AI-generated for entertainment and self-exploration —
          not a medical or scientific assessment.
        </p>
      </div>
    </div>
  );
}
