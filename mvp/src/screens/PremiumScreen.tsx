import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { usePremiumStore } from "../storage/premium-store";
import { ROUTES } from "../navigation/routes";

const FEATURES = [
  { icon: "🔍", label: "Full-depth analysis across every category" },
  { icon: "💄", label: "Personalized makeup guide with step-by-step looks" },
  { icon: "💇‍♀️", label: "Hair styling recommendations tailored to your face shape" },
  { icon: "🎨", label: "Full seasonal color analysis" },
  { icon: "🛍️", label: "Expanded, personalized product recommendations" },
  { icon: "♾️", label: "Unlimited scans, no monthly cap" },
];

export function PremiumScreen() {
  const navigate = useNavigate();
  const { unlocked, unlock } = usePremiumStore();
  const [justUnlocked, setJustUnlocked] = useState(false);

  function handleUnlock() {
    unlock();
    setJustUnlocked(true);
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col text-white" style={{ background: "var(--color-ink)" }}>
      <div className="px-5 pt-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Back"
        >
          ←
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
        <div className="flex flex-col items-center pt-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 text-2xl">👑</div>
          <h1 className="mt-4 font-display text-[26px] font-medium">Glow-Up Pro</h1>
          <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-white/70">
            Unlock the full depth of your analysis and personalized guidance.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3.5">
              <span className="text-lg">{f.icon}</span>
              <span className="text-[13.5px] leading-snug text-white/90">{f.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-center">
          <p className="font-display text-2xl font-medium text-gold-light">$9.99/mo</p>
          <p className="mt-1 text-[12px] text-white/60">Prototype only — no real payment will be charged</p>
        </div>
      </div>

      <div className="px-6 pb-10 pt-4">
        {unlocked || justUnlocked ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[14px] font-semibold text-sage">✓ Glow-Up Pro unlocked (prototype)</p>
            <Button variant="secondary" onClick={() => navigate(ROUTES.home)}>
              Back to home
            </Button>
          </div>
        ) : (
          <Button className="!bg-gold !text-ink" onClick={handleUnlock}>
            Unlock Glow-Up Pro
          </Button>
        )}
        <p className="mt-4 text-center text-[11px] text-white/40">
          No payment infrastructure is wired up — this is a prototype success state only.
        </p>
      </div>
    </div>
  );
}
