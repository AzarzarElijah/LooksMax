import { useEffect, useRef, useState } from "react";
import { fitDimensions, JPEG_QUALITY, MAX_DIMENSION } from "../utils/image";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

// Live front-camera capture, shown as an alternative to picking a file.
// Requires a secure context (https, or localhost during dev) — getUserMedia
// throws otherwise, which we surface as a friendly fallback message.
export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access isn't available in this browser. Try uploading a photo instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (!cancelled) setReady(true);
      } catch (err) {
        if (cancelled) return;
        const denied = err instanceof DOMException && err.name === "NotAllowedError";
        setError(
          denied
            ? "Camera access was denied. Allow camera access in your browser, or upload a photo instead."
            : "Couldn't access your camera. Try uploading a photo instead.",
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function handleShutter() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const { width, height } = fitDimensions(video.videoWidth, video.videoHeight, MAX_DIMENSION);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror horizontally so the saved photo matches the on-screen preview.
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    stopStream();
    onCapture(dataUrl);
  }

  function handleCancel() {
    stopStream();
    onCancel();
  }

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-ink">
      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="text-3xl">🚫</span>
          <p className="text-[13.5px] leading-relaxed text-white/80">{error}</p>
          <button
            type="button"
            onClick={handleCancel}
            className="mt-2 rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold text-white"
          >
            Back
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover [transform:scaleX(-1)]"
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-white/70">
              Starting camera…
            </div>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white"
            aria-label="Cancel"
          >
            ✕
          </button>
          {ready && (
            <button
              type="button"
              onClick={handleShutter}
              className="absolute bottom-5 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-white bg-white/30 transition active:scale-95"
              aria-label="Take photo"
            />
          )}
        </>
      )}
    </div>
  );
}
