// Score post-processing per PROJECT_CONTEXT.md §17 item 5.
// displayed = floor + raw/100 * (100 - floor), floor = 70, whole numbers only.

export const SCORE_FLOOR = 70;

export function rescaleScore(raw: number, floor: number = SCORE_FLOOR): number {
  const clamped = Math.max(0, Math.min(100, raw));
  return Math.round(floor + (clamped / 100) * (100 - floor));
}
