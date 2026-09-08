import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { CameraCapture } from "../components/CameraCapture";
import { fileToResizedDataUrl, InvalidImageError } from "../utils/image";
import { useScanStore } from "../storage/scan-store";
import { useOnboardingStore } from "../storage/onboarding-store";
import { ROUTES } from "../navigation/routes";

export function UploadScreen() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { draftPhoto, setDraftPhoto } = useScanStore();
  const { completed } = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setDraftPhoto(dataUrl);
    } catch (err) {
      setError(err instanceof InvalidImageError ? err.message : "Couldn't process that photo. Try another one.");
    } finally {
      setBusy(false);
    }
  }

  function handleCameraCapture(dataUrl: string) {
    setError(null);
    setDraftPhoto(dataUrl);
    setCameraOpen(false);
  }

  function handleContinue() {
    if (!draftPhoto) return;
    if (!completed) {
      navigate(ROUTES.onboardingAge);
      return;
    }
    navigate(ROUTES.analyzing);
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <ScreenHeader title="Your selfie" showBack={Boolean(draftPhoto) && !cameraOpen} />

      <div className="flex-1 overflow-y-auto px-6 pt-2">
        {!draftPhoto && !cameraOpen && (
          <>
            <h1 className="font-display text-[24px] font-medium text-ink">Let's take a look</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
              Use a clear, front-facing photo with good lighting. No filters — we want to see the
              real you so the recommendations actually fit.
            </p>
          </>
        )}

        <div className="mt-6">
          {draftPhoto ? (
            <div className="overflow-hidden rounded-3xl bg-cream-deep shadow-inner">
              <img src={draftPhoto} alt="Your selfie preview" className="aspect-[3/4] w-full object-cover" />
            </div>
          ) : cameraOpen ? (
            <CameraCapture onCapture={handleCameraCapture} onCancel={() => setCameraOpen(false)} />
          ) : (
            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-blush/40 bg-blush-light/40 p-8 text-center text-ink-soft">
              <span className="text-4xl">{busy ? "⏳" : "🤳"}</span>
              <span className="text-[13px] leading-relaxed text-ink-soft/80">
                {busy ? "Processing photo…" : "Take a new photo or choose one from your library."}
              </span>
              <div className="mt-2 flex w-full flex-col gap-2.5">
                <Button onClick={() => setCameraOpen(true)} disabled={busy}>
                  📷 Take Photo
                </Button>
                <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
                  Upload from Library
                </Button>
              </div>
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {!cameraOpen && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-cream-deep/60 p-3.5 text-[12px] leading-relaxed text-ink-soft">
            <span>🔒</span>
            <span>
              Your photo stays on this device unless you're using live AI analysis, in which case
              it's sent only to the analysis provider for that single request.
            </span>
          </div>
        )}
      </div>

      {!cameraOpen && (
        <div className="flex gap-3 px-6 pb-10 pt-4">
          {draftPhoto && (
            <Button variant="outline" fullWidth={false} className="flex-1" onClick={() => setDraftPhoto(null)}>
              Retake
            </Button>
          )}
          <Button className="flex-[2]" onClick={handleContinue} disabled={!draftPhoto || busy}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
