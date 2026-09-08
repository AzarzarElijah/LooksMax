interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-800">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-full bg-red-800/10 px-4 py-1.5 text-[13px] font-semibold text-red-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}
