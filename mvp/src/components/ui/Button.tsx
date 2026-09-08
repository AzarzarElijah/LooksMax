import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-blush-deep text-white shadow-lg shadow-blush/30 hover:bg-blush-deep/90 active:scale-[0.98]",
  secondary: "bg-cream-deep text-ink hover:bg-cream-deep/70 active:scale-[0.98]",
  outline: "bg-transparent border border-ink/15 text-ink hover:bg-ink/5 active:scale-[0.98]",
  ghost: "bg-transparent text-ink-soft hover:text-ink",
};

export function Button({
  variant = "primary",
  fullWidth = true,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth ? "w-full" : "",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
