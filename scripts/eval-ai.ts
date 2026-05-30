#!/usr/bin/env tsx
/**
 * AI eval harness.
 *
 *   npm run eval:ai
 *
 * Walks every golden in scripts/eval-ai-goldens.ts, calls analyzeStock(),
 * and scores each result against:
 *   - The Zod schema (already enforced by the analyzer, but we double-check)
 *   - Structural sanity (target near current price, upside math consistent,
 *     bull/bear/risk arrays non-trivial, rating in valid set, etc.)
 *
 * Outputs a per-ticker table to stdout AND writes eval-report.json next to
 * the script for CI archival / diffing across runs. Exits non-zero if any
 * ticker scores below the pass threshold so we can wire it to CI later.
 *
 * Requires OPENROUTER_API_KEY. Without it, the harness prints "skipped".
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeStock } from "@/lib/ai/analyzer";
import type { AnalysisResult } from "@/lib/ai/schema";
import { GOLDEN_TICKERS } from "./eval-ai-goldens";

const PASS_THRESHOLD = 0.8;

interface Score {
  ticker: string;
  pass: boolean;
  score: number; // 0 - 1
  notes: string[];
  result?: AnalysisResult;
  stubbed?: boolean;
  reason?: string;
  durationMs?: number;
}

interface Report {
  ranAt: string;
  model: string;
  scores: Score[];
  passed: number;
  failed: number;
  averageScore: number;
}

function scoreResult(
  input: { currentPrice: number; companyName: string; ticker: string },
  result: AnalysisResult,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let earned = 0;
  const checks = [
    () => {
      // Rating in expected set (defensive - schema already enforces).
      const ok = ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"].includes(result.rating);
      if (!ok) notes.push("rating not in valid set");
      return ok ? 1 : 0;
    },
    () => {
      const ok = result.confidence >= 0 && result.confidence <= 100;
      if (!ok) notes.push(`confidence out of range: ${result.confidence}`);
      return ok ? 1 : 0;
    },
    () => {
      const ok = result.priceTarget > 0;
      if (!ok) notes.push("price target is zero");
      return ok ? 1 : 0;
    },
    () => {
      // Target within +/-150% of current price. Anything wider is a flag.
      const ratio = result.priceTarget / Math.max(1e-6, input.currentPrice);
      const ok = ratio > 0.25 && ratio < 4.0;
      if (!ok) notes.push(`unrealistic target: ${result.priceTarget} vs current ${input.currentPrice}`);
      return ok ? 1 : 0;
    },
    () => {
      // Upside math sanity - should be approximately (target - current) / current * 100.
      const expectedUpside = ((result.priceTarget - input.currentPrice) / input.currentPrice) * 100;
      const drift = Math.abs(result.upside - expectedUpside);
      const ok = drift < 5; // 5pp tolerance
      if (!ok) notes.push(`upside drift: claimed ${result.upside.toFixed(1)}%, derived ${expectedUpside.toFixed(1)}%`);
      return ok ? 1 : 0;
    },
    () => {
      const ok = result.bullCase.length >= 2 && result.bearCase.length >= 2;
      if (!ok) notes.push("thin bull/bear cases");
      return ok ? 1 : 0;
    },
    () => {
      const ok = result.keyRisks.length >= 2 && result.catalysts.length >= 1;
      if (!ok) notes.push("missing risks or catalysts");
      return ok ? 1 : 0;
    },
    () => {
      const ok = result.summary.length >= 80 && result.summary.length <= 700;
      if (!ok) notes.push(`summary length unusual: ${result.summary.length}`);
      return ok ? 1 : 0;
    },
    () => {
      // Bull / bear shouldn't be identical (lazy duplication).
      const dupes = result.bullCase.filter((b) => result.bearCase.includes(b)).length;
      const ok = dupes === 0;
      if (!ok) notes.push(`${dupes} duplicate bull/bear bullets`);
      return ok ? 1 : 0;
    },
    () => {
      // Mentions the company name or ticker somewhere in the summary - basic
      // grounding check.
      const hay = result.summary.toLowerCase();
      const ok = hay.includes(input.ticker.toLowerCase()) ||
        input.companyName.toLowerCase().split(/\s+/).some((w) => w.length > 3 && hay.includes(w));
      if (!ok) notes.push("summary doesn't mention the company");
      return ok ? 1 : 0;
    },
  ];
  for (const check of checks) earned += check();
  return { score: earned / checks.length, notes };
}

async function run(): Promise<Report> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn(
      "[eval] OPENROUTER_API_KEY not set - the harness will run, but every golden will produce a stubbed result.",
    );
  }

  const scores: Score[] = [];
  for (const data of GOLDEN_TICKERS) {
    process.stdout.write(`  ${data.ticker.padEnd(14)} `);
    const t0 = performance.now();
    try {
      const outcome = await analyzeStock(data);
      const durationMs = Math.round(performance.now() - t0);
      const { score, notes } = scoreResult(
        { currentPrice: data.currentPrice, companyName: data.companyName, ticker: data.ticker },
        outcome.result,
      );
      const pass = !outcome.stubbed && score >= PASS_THRESHOLD;
      scores.push({
        ticker: data.ticker,
        pass,
        score,
        notes,
        result: outcome.result,
        stubbed: outcome.stubbed,
        reason: outcome.reason,
        durationMs,
      });
      const tag = outcome.stubbed ? "STUB" : pass ? "PASS" : "FAIL";
      process.stdout.write(
        `${tag.padEnd(5)} score=${(score * 100).toFixed(0).padStart(3)}%  ${durationMs}ms\n`,
      );
      if (notes.length > 0) for (const n of notes) console.log(`      - ${n}`);
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      console.log(`THREW  ${err instanceof Error ? err.message : err}`);
      scores.push({
        ticker: data.ticker,
        pass: false,
        score: 0,
        notes: [err instanceof Error ? err.message : "unknown error"],
        durationMs,
      });
    }
  }

  const passed = scores.filter((s) => s.pass).length;
  const failed = scores.length - passed;
  const averageScore =
    scores.reduce((acc, s) => acc + s.score, 0) / Math.max(1, scores.length);

  return {
    ranAt: new Date().toISOString(),
    model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-pro",
    scores,
    passed,
    failed,
    averageScore,
  };
}

(async () => {
  console.log("[eval] running goldens against the analyzer...\n");
  const report = await run();
  console.log("");
  console.log(`  passed: ${report.passed}/${report.scores.length}`);
  console.log(`  failed: ${report.failed}`);
  console.log(`  avg score: ${(report.averageScore * 100).toFixed(1)}%`);
  console.log(`  model: ${report.model}`);

  const out = resolve(process.cwd(), "scripts", "eval-report.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\n  report written: ${out}`);

  if (report.failed > 0 && process.env.OPENROUTER_API_KEY) {
    process.exit(1);
  }
})().catch((err) => {
  console.error("[eval] fatal:", err);
  process.exit(2);
});
