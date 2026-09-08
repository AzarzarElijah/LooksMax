import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { StepDots } from "../../components/ui/StepDots";
import { useOnboardingStore } from "../../storage/onboarding-store";
import { ROUTES } from "../../navigation/routes";

export function AgeScreen() {
  const navigate = useNavigate();
  const { setAge, underAgeBlocked } = useOnboardingStore();
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const age = Number(value);
  const isValid = value.trim() !== "" && Number.isInteger(age) && age > 0 && age < 120;

  function handleContinue() {
    setTouched(true);
    if (!isValid) return;
    setAge(age);
    if (age >= 13) navigate(ROUTES.onboardingGoals);
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <StepDots step={1} total={3} />
      <div className="flex flex-1 flex-col justify-center px-6">
        <h1 className="font-display text-[26px] font-medium text-ink">How old are you?</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          We tailor recommendations to your age group. This stays on your device.
        </p>

        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter your age"
          className="mt-8 w-full rounded-2xl border border-ink/10 bg-white px-5 py-4 text-[18px] font-medium text-ink outline-none focus:border-blush-deep"
          autoFocus
        />

        {touched && !isValid && (
          <p className="mt-2 text-[13px] text-red-600">Please enter a valid age.</p>
        )}

        {underAgeBlocked && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-900">
            This prototype isn't available for users under 13. Thanks for checking it out — please
            come back when you're a little older!
          </div>
        )}
      </div>

      <div className="px-6 pb-10">
        <Button onClick={handleContinue} disabled={touched && value.trim() !== "" && !isValid}>
          Continue
        </Button>
      </div>
    </div>
  );
}
