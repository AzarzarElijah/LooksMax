export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Standout";
  if (score >= 75) return "Strong";
  if (score >= 65) return "Solid foundation";
  return "Room to grow";
}

export function difficultyLabel(d: "easy" | "moderate" | "involved"): string {
  return { easy: "Easy", moderate: "Moderate", involved: "Involved" }[d];
}

export function impactLabel(i: "low" | "medium" | "high"): string {
  return { low: "Low impact", medium: "Medium impact", high: "High impact" }[i];
}
