import { useNavigate } from "react-router-dom";

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, showBack = true, right }: ScreenHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-cream/90 px-5 pb-2 pt-5 backdrop-blur">
      <button
        type="button"
        onClick={() => (onBack ? onBack() : navigate(-1))}
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-sm ring-1 ring-black/[0.04]",
          showBack ? "opacity-100" : "invisible",
        ].join(" ")}
        aria-label="Back"
      >
        ←
      </button>
      {title && <h1 className="font-display text-[17px] font-medium text-ink">{title}</h1>}
      <div className="flex h-9 w-9 items-center justify-end">{right}</div>
    </div>
  );
}
