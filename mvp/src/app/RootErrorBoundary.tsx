import { useRouteError } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function RootErrorBoundary() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="text-3xl">😕</span>
      <h1 className="font-display text-[20px] font-medium text-ink">Something went wrong</h1>
      <p className="text-[14px] text-ink-soft">
        We hit an unexpected error. Try reloading — your saved scans and profile are safe.
      </p>
      <Button onClick={() => (window.location.href = "/")}>Back to start</Button>
    </div>
  );
}
