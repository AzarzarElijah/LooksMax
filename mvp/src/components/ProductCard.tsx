import { useState } from "react";
import type { MockProduct } from "../data/mock-products";

export function ProductCard({ product }: { product: MockProduct }) {
  const [viewed, setViewed] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_2px_16px_rgba(43,35,31,0.05)] ring-1 ring-black/[0.03]">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ backgroundColor: product.color ? `${product.color}22` : "var(--color-cream-deep)" }}
      >
        {product.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{product.name}</p>
        <p className="truncate text-[11.5px] text-ink-soft">{product.brand}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-soft/80">{product.whyRecommended}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-[13px] font-semibold text-ink">{product.price}</span>
        <button
          type="button"
          onClick={() => setViewed(true)}
          className="rounded-full bg-cream-deep px-3 py-1 text-[11px] font-semibold text-ink-soft transition active:scale-95"
        >
          {viewed ? "Viewed ✓" : "View product"}
        </button>
      </div>
    </div>
  );
}
