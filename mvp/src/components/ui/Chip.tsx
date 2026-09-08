import type { ReactNode } from "react";

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
}

export function Chip({ selected, onClick, children, icon }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-[14px] font-medium transition active:scale-[0.98]",
        selected
          ? "border-blush-deep bg-blush-light text-blush-deep"
          : "border-ink/10 bg-white text-ink-soft hover:border-ink/20",
      ].join(" ")}
    >
      {icon && <span className="text-lg leading-none">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
