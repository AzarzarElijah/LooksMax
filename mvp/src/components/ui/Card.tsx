import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={[
        "rounded-3xl bg-white/80 p-5 shadow-[0_2px_20px_rgba(43,35,31,0.06)] ring-1 ring-black/[0.03]",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
