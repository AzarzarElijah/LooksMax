import "dotenv/config";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeWithClaude, type ProviderCallResult } from "./claude-client.js";
import { analyzeWithGpt4v } from "./openai-client.js";
import { scanForBlockedTerms } from "./blocklist.js";
import { rescaleScore } from "./rescale.js";
import type { AnalysisResult } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = join(__dirname, "..", "test-photos");
const RESULTS_DIR = join(__dirname, "..", "results");

interface EvalRow {
  image: string;
  makeupOn: boolean;
  claude: EvalOutcome;
  gpt4v: EvalOutcome;
}

type EvalOutcome =
  | { ok: true; model: string; latencyMs: number; blockedHits: number; makeupNullCorrect: boolean; overallDisplayScore: number; result: AnalysisResult }
  | { ok: false; error: string };

function toOutcome(settled: PromiseSettledResult<ProviderCallResult | (Omit<ProviderCallResult, "provider"> & { provider: "gpt4v" })>, makeupOn: boolean): EvalOutcome {
  if (settled.status === "rejected") {
    return { ok: false, error: String(settled.reason?.message ?? settled.reason) };
  }
  const { model, latencyMs, result } = settled.value;
  const hits = scanForBlockedTerms(result);
  const makeupNullCorrect = makeupOn ? result.categories.makeup !== null : result.categories.makeup === null;
  return {
    ok: true,
    model,
    latencyMs,
    blockedHits: hits.length,
    makeupNullCorrect,
    overallDisplayScore: rescaleScore(result.overall_score),
    result,
  };
}

function printRow(row: EvalRow) {
  console.log(`\n=== ${row.image} (makeup_on=${row.makeupOn}) ===`);
  for (const [name, outcome] of [["Claude", row.claude], ["GPT-4V", row.gpt4v]] as const) {
    if (!outcome.ok) {
      console.log(`  ${name}: FAILED - ${outcome.error}`);
      continue;
    }
    console.log(
      `  ${name} (${outcome.model}, ${outcome.latencyMs}ms): ` +
        `display_score=${outcome.overallDisplayScore} ` +
        `mst=${outcome.result.detected_skin_tone.mst_scale} (${outcome.result.detected_skin_tone.label}) ` +
        `blocklist_hits=${outcome.blockedHits} ` +
        `makeup_null_correct=${outcome.makeupNullCorrect}`
    );
    if (outcome.blockedHits > 0) {
      console.log(`    !! BLOCKLIST HIT on ${row.image} (${name})`);
    }
    if (!outcome.makeupNullCorrect) {
      console.log(`    !! makeup field did not match makeup_on flag for ${row.image} (${name})`);
    }
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY and/or OPENAI_API_KEY. Copy .env.example to .env and fill them in.");
    process.exit(1);
  }

  const files = readdirSync(PHOTOS_DIR).filter((f) => f.toLowerCase().endsWith(".jpg"));
  if (files.length === 0) {
    console.error(`No .jpg files found in ${PHOTOS_DIR}`);
    process.exit(1);
  }

  const rows: EvalRow[] = [];

  for (const file of files) {
    const makeupOn = file.includes("_makeup") && !file.includes("_nomakeup");
    const base64 = readFileSync(join(PHOTOS_DIR, file)).toString("base64");

    const [claudeSettled, gpt4vSettled] = await Promise.allSettled([
      analyzeWithClaude(base64, makeupOn),
      analyzeWithGpt4v(base64, makeupOn),
    ]);

    const row: EvalRow = {
      image: file,
      makeupOn,
      claude: toOutcome(claudeSettled, makeupOn),
      gpt4v: toOutcome(gpt4vSettled, makeupOn),
    };
    rows.push(row);
    printRow(row);
  }

  // Summary
  console.log("\n\n=== SUMMARY ===");
  for (const provider of ["claude", "gpt4v"] as const) {
    const outcomes = rows.map((r) => r[provider]);
    const ok = outcomes.filter((o) => o.ok) as Extract<EvalOutcome, { ok: true }>[];
    const failed = outcomes.length - ok.length;
    const blockedTotal = ok.reduce((sum, o) => sum + o.blockedHits, 0);
    const makeupCorrect = ok.filter((o) => o.makeupNullCorrect).length;
    const avgLatency = ok.length ? Math.round(ok.reduce((s, o) => s + o.latencyMs, 0) / ok.length) : 0;
    console.log(
      `${provider}: ${ok.length}/${outcomes.length} valid schema responses, ${failed} failed/malformed, ` +
        `${blockedTotal} total blocklist hits, ${makeupCorrect}/${ok.length} correct makeup-null handling, ` +
        `avg latency ${avgLatency}ms`
    );
  }
  console.log(
    "\nNote: this synthetic (StyleGAN2/FFHQ-based) test set skewed toward lighter skin tones despite " +
      "screening 32 generations for diversity — MST-scale accuracy here is a smoke test only, not a bias audit. " +
      "Run a real bias audit against a balanced dataset (e.g. FairFace) before launch."
  );

  mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = join(RESULTS_DIR, `results-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(rows, null, 2));
  console.log(`\nFull results written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
