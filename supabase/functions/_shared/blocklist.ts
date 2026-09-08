// Rule-based backstop per PROJECT_CONTEXT.md §17 item 6.
// Scans every string field of a result for medical/diagnostic terms that should never appear.
// Kept in step with eval/src/blocklist.ts.

const MEDICAL_TERMS = [
  "acne",
  "rosacea",
  "eczema",
  "psoriasis",
  "dermatitis",
  "cyst",
  "lesion",
  "melanoma",
  "skin cancer",
  "fungal",
  "infection",
  "hormonal imbalance",
  "medical condition",
  "dermatologist",
  "see a doctor",
  "physician",
  "diagnos", // catches diagnose/diagnosis
  "inflamed",
  "inflammation",
  "hyperpigmentation", // borderline-clinical framing term, flag for review
];

export interface BlocklistHit {
  term: string;
  context: string;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

export function scanForBlockedTerms(result: unknown): BlocklistHit[] {
  const strings: string[] = [];
  collectStrings(result, strings);
  const hits: BlocklistHit[] = [];
  for (const str of strings) {
    const lower = str.toLowerCase();
    for (const term of MEDICAL_TERMS) {
      if (lower.includes(term)) {
        hits.push({ term, context: str });
      }
    }
  }
  return hits;
}
