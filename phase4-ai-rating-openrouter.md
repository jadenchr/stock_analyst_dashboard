# Phase 4 — AI Analyst Rating (OpenRouter + Gemini 2.5 Pro)

The app is already live on Vercel with Phases 1–3 complete. Now implement Phase 4: the AI Analyst Rating feature. Do NOT touch or refactor any existing code from previous phases unless strictly required for integration.

---

## OVERVIEW

Build a complete AI-powered stock rating system using **OpenRouter** as the AI provider with **`google/gemini-2.5-pro`** as the model. The system takes pre-fetched stock financial data (already available from Phase 2's data layer), sends it to Gemini 2.5 Pro via OpenRouter's OpenAI-compatible API, and returns a structured investment rating rendered as an animated UI module.

---

## STEP 1 — Install Dependencies

```bash
npm install lru-cache zod
```

No Anthropic SDK. No OpenAI SDK. Use native `fetch` for the OpenRouter API call — it's a simple REST endpoint.

---

## STEP 2 — Environment Variables

Add these to `.env.local` AND to your Vercel project's Environment Variables dashboard:

```bash
# OpenRouter
OPENROUTER_API_KEY=sk-or-your-key-here

# Your deployed app URL (already set, just confirm it exists)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Get your key at: https://openrouter.ai → Sign in → Keys → Create Key
Add credits: Gemini 2.5 Pro costs ~$1.25 per 1M input tokens — a single stock analysis uses ~2,000–4,000 tokens, so $1 of credits = hundreds of analyses.

---

## STEP 3 — Zod Schema (`/lib/ai/schema.ts`)

Create this file. It validates the JSON response from Gemini before it ever reaches the client.

```typescript
import { z } from "zod";

export const RatingEnum = z.enum([
  "STRONG_BUY",
  "BUY",
  "HOLD",
  "SELL",
  "STRONG_SELL",
]);

export const AnalysisSchema = z.object({
  rating: RatingEnum,
  confidence: z.number().int().min(0).max(100),
  priceTarget: z.number().positive(),
  targetHorizon: z.string().default("12 months"),
  upside: z.number(),
  summary: z.string().min(20).max(500),
  bullCase: z.array(z.string()).min(2).max(5),
  bearCase: z.array(z.string()).min(2).max(5),
  keyRisks: z.array(z.string()).min(1).max(4),
  catalysts: z.array(z.string()).min(1).max(4),
  valuation: z.string().min(10).max(200),
  technicals: z.string().min(10).max(200),
  sectorContext: z.string().min(10).max(200),
  lastUpdated: z.string().datetime().optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

// Fallback returned when AI call fails after retries
export const FALLBACK_ANALYSIS: AnalysisResult = {
  rating: "HOLD",
  confidence: 0,
  priceTarget: 0,
  targetHorizon: "12 months",
  upside: 0,
  summary: "AI analysis temporarily unavailable. Please try again shortly.",
  bullCase: ["Data unavailable"],
  bearCase: ["Data unavailable"],
  keyRisks: ["Analysis failed"],
  catalysts: ["Analysis failed"],
  valuation: "Unavailable",
  technicals: "Unavailable",
  sectorContext: "Unavailable",
  lastUpdated: new Date().toISOString(),
};
```

---

## STEP 4 — Prompt Templates (`/lib/ai/prompts.ts`)

```typescript
export const SYSTEM_PROMPT = `You are a senior equity research analyst at a bulge-bracket investment bank (Goldman Sachs / Morgan Stanley tier). You write rigorous, data-driven investment research based on fundamental analysis, technical signals, and macro context.

Your output must be a single valid JSON object — no preamble, no markdown, no explanation outside the JSON. Raw JSON only.

Rating scale:
- STRONG_BUY: Compelling value + strong catalysts + favorable technicals
- BUY: Attractive risk/reward, fundamentals support upside
- HOLD: Fair valued, balanced risks, no strong directional signal
- SELL: Overvalued or deteriorating fundamentals, downside likely
- STRONG_SELL: Significantly overvalued or fundamental breakdown, clear downside

Confidence score: 0–100 representing your conviction in the rating given data quality and clarity of signals.

Be specific. Use the actual numbers provided. Avoid generic statements. Each bull/bear point must reference a specific metric or catalyst from the data provided.`;

export function buildUserPrompt(ticker: string, data: StockDataForAnalysis): string {
  return `Analyze ${ticker} and provide an investment rating based on this data:

COMPANY: ${data.companyName} (${ticker}) — ${data.sector} / ${data.industry}
EXCHANGE: ${data.exchange}
CURRENT PRICE: $${data.currentPrice}
52-WEEK RANGE: $${data.week52Low} – $${data.week52High}
MARKET CAP: $${data.marketCap}

--- VALUATION ---
P/E Ratio (TTM): ${data.peRatio ?? "N/A"}
Forward P/E: ${data.forwardPE ?? "N/A"}
P/B Ratio: ${data.pbRatio ?? "N/A"}
P/S Ratio: ${data.psRatio ?? "N/A"}
EV/EBITDA: ${data.evEbitda ?? "N/A"}
PEG Ratio: ${data.pegRatio ?? "N/A"}
Sector Avg P/E: ${data.sectorPE ?? "N/A"}

--- FINANCIALS (Most Recent Annual) ---
Revenue: $${data.revenue ?? "N/A"} (YoY Growth: ${data.revenueGrowth ?? "N/A"}%)
Gross Margin: ${data.grossMargin ?? "N/A"}%
Operating Margin: ${data.operatingMargin ?? "N/A"}%
Net Margin: ${data.netMargin ?? "N/A"}%
EPS (TTM): $${data.epsTTM ?? "N/A"}
EPS (Forward): $${data.epsForward ?? "N/A"}
EPS Growth (YoY): ${data.epsGrowth ?? "N/A"}%

--- BALANCE SHEET ---
Total Cash: $${data.totalCash ?? "N/A"}
Total Debt: $${data.totalDebt ?? "N/A"}
Debt/Equity: ${data.debtToEquity ?? "N/A"}
Current Ratio: ${data.currentRatio ?? "N/A"}
Quick Ratio: ${data.quickRatio ?? "N/A"}

--- CASH FLOW ---
Operating Cash Flow: $${data.operatingCashFlow ?? "N/A"}
Free Cash Flow: $${data.freeCashFlow ?? "N/A"}
FCF Yield: ${data.fcfYield ?? "N/A"}%

--- TECHNICAL SIGNALS ---
Price vs 50-Day MA: ${data.priceVs50MA ?? "N/A"}%
Price vs 200-Day MA: ${data.priceVs200MA ?? "N/A"}%
RSI (14): ${data.rsi ?? "N/A"}
MACD Signal: ${data.macdSignal ?? "N/A"}
Beta: ${data.beta ?? "N/A"}

--- ANALYST CONSENSUS ---
Analyst Rating Count — Buy: ${data.analystBuy ?? "N/A"} | Hold: ${data.analystHold ?? "N/A"} | Sell: ${data.analystSell ?? "N/A"}
Average Price Target: $${data.avgPriceTarget ?? "N/A"}
High Target: $${data.highPriceTarget ?? "N/A"}
Low Target: $${data.lowPriceTarget ?? "N/A"}

--- OWNERSHIP & SENTIMENT ---
Institutional Ownership: ${data.institutionalOwnership ?? "N/A"}%
Short Float: ${data.shortFloat ?? "N/A"}%
Insider Ownership: ${data.insiderOwnership ?? "N/A"}%

Respond with ONLY this JSON structure, no other text:
{
  "rating": "BUY",
  "confidence": 72,
  "priceTarget": 0.00,
  "targetHorizon": "12 months",
  "upside": 0.0,
  "summary": "3 sentences max. Plain English. Reference specific metrics.",
  "bullCase": ["specific point with metric", "specific point with metric", "specific point with metric"],
  "bearCase": ["specific point with metric", "specific point with metric"],
  "keyRisks": ["specific risk 1", "specific risk 2"],
  "catalysts": ["specific catalyst 1", "specific catalyst 2"],
  "valuation": "One sentence on valuation vs peers/history",
  "technicals": "One sentence on technical setup",
  "sectorContext": "One sentence on sector/macro tailwinds or headwinds",
  "lastUpdated": "${new Date().toISOString()}"
}`;
}

export interface StockDataForAnalysis {
  companyName: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  currentPrice: number;
  week52Low: number;
  week52High: number;
  marketCap: number;
  peRatio?: number;
  forwardPE?: number;
  pbRatio?: number;
  psRatio?: number;
  evEbitda?: number;
  pegRatio?: number;
  sectorPE?: number;
  revenue?: number;
  revenueGrowth?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  epsTTM?: number;
  epsForward?: number;
  epsGrowth?: number;
  totalCash?: number;
  totalDebt?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  operatingCashFlow?: number;
  freeCashFlow?: number;
  fcfYield?: number;
  priceVs50MA?: number;
  priceVs200MA?: number;
  rsi?: number;
  macdSignal?: string;
  beta?: number;
  analystBuy?: number;
  analystHold?: number;
  analystSell?: number;
  avgPriceTarget?: number;
  highPriceTarget?: number;
  lowPriceTarget?: number;
  institutionalOwnership?: number;
  shortFloat?: number;
  insiderOwnership?: number;
}
```

---

## STEP 5 — OpenRouter API Caller (`/lib/ai/analyzer.ts`)

```typescript
import { AnalysisSchema, AnalysisResult, FALLBACK_ANALYSIS } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt, StockDataForAnalysis } from "./prompts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";
const MAX_RETRIES = 2;

async function callOpenRouter(userPrompt: string): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000",
      "X-Title": "StockVision AI Analyst",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,        // Low = consistent, factual, less hallucination
      max_tokens: 1200,
      response_format: { type: "json_object" }, // Forces pure JSON output
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter returned empty content");
  }

  return content;
}

export async function analyzeStock(
  ticker: string,
  stockData: StockDataForAnalysis
): Promise<AnalysisResult> {
  const userPrompt = buildUserPrompt(ticker, stockData);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await callOpenRouter(userPrompt);

      // Strip any accidental markdown code fences (safety net)
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      const validated = AnalysisSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error(`[analyzeStock] Attempt ${attempt} failed:`, error);

      if (attempt === MAX_RETRIES) {
        // Return fallback — never crash the page over AI failure
        return {
          ...FALLBACK_ANALYSIS,
          lastUpdated: new Date().toISOString(),
        };
      }

      // Wait 1s before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return FALLBACK_ANALYSIS;
}
```

---

## STEP 6 — LRU Cache (`/lib/cache/analysis-cache.ts`)

Cache AI responses per ticker for 15 minutes to avoid repeated API calls and control costs.

```typescript
import { LRUCache } from "lru-cache";
import { AnalysisResult } from "@/lib/ai/schema";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_MAX_ITEMS = 100;

export const analysisCache = new LRUCache<string, AnalysisResult>({
  max: CACHE_MAX_ITEMS,
  ttl: CACHE_TTL_MS,
});

export function getCachedAnalysis(ticker: string): AnalysisResult | undefined {
  return analysisCache.get(ticker.toUpperCase());
}

export function setCachedAnalysis(ticker: string, result: AnalysisResult): void {
  analysisCache.set(ticker.toUpperCase(), result);
}
```

---

## STEP 7 — API Route Handler (`/app/api/analyze/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeStock } from "@/lib/ai/analyzer";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/cache/analysis-cache";
import { StockDataForAnalysis } from "@/lib/ai/prompts";

// Input validation
const RequestSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9.\-]+$/, "Invalid ticker format")
    .transform((v) => v.toUpperCase()),
  stockData: z.object({}).passthrough(), // Accept the full stock data object
});

// Simple in-memory rate limiter (per-IP, 5 AI requests per minute)
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (record.count >= 5) return false;

  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. AI analysis is limited to 5 per minute." },
        { status: 429 }
      );
    }

    // Parse + validate request body
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ticker, stockData } = parsed.data;

    // Check cache first
    const cached = getCachedAnalysis(ticker);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true }, { status: 200 });
    }

    // Ensure API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("[analyze] OPENROUTER_API_KEY is not set");
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    // Run analysis
    const result = await analyzeStock(ticker, stockData as StockDataForAnalysis);

    // Cache result
    setCachedAnalysis(ticker, result);

    return NextResponse.json({ ...result, cached: false }, { status: 200 });
  } catch (error) {
    // Log server-side only, never expose details to client
    console.error("[analyze] Unhandled error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}

// Block all other HTTP methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
```

---

## STEP 8 — Client Hook (`/hooks/useStockAnalysis.ts`)

```typescript
import { useQuery } from "@tanstack/react-query";
import { AnalysisResult } from "@/lib/ai/schema";
import { StockDataForAnalysis } from "@/lib/ai/prompts";

async function fetchAnalysis(
  ticker: string,
  stockData: StockDataForAnalysis
): Promise<AnalysisResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, stockData }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Analysis failed");
  }

  return res.json();
}

export function useStockAnalysis(
  ticker: string,
  stockData: StockDataForAnalysis | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["analysis", ticker],
    queryFn: () => fetchAnalysis(ticker, stockData!),
    enabled: enabled && !!ticker && !!stockData,
    staleTime: 14 * 60 * 1000,   // 14 min (just under server 15-min cache)
    gcTime: 30 * 60 * 1000,       // Keep in client memory 30 min
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
```

---

## STEP 9 — UI Component (`/components/stock/AIRating.tsx`)

Build this component. It renders the full AI rating card.

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { AnalysisResult } from "@/lib/ai/schema";

// ---- Rating config ----
const RATING_CONFIG = {
  STRONG_BUY: {
    label: "STRONG BUY",
    color: "var(--rating-strong-buy)",
    glow: "0 0 30px rgba(0, 255, 135, 0.5), 0 0 60px rgba(0, 255, 135, 0.2)",
    bg: "rgba(0, 255, 135, 0.08)",
    border: "rgba(0, 255, 135, 0.4)",
    pulse: true,
  },
  BUY: {
    label: "BUY",
    color: "var(--rating-buy)",
    glow: "0 0 20px rgba(0, 212, 170, 0.4)",
    bg: "rgba(0, 212, 170, 0.08)",
    border: "rgba(0, 212, 170, 0.3)",
    pulse: false,
  },
  HOLD: {
    label: "HOLD",
    color: "var(--rating-hold)",
    glow: "0 0 20px rgba(255, 209, 102, 0.3)",
    bg: "rgba(255, 209, 102, 0.08)",
    border: "rgba(255, 209, 102, 0.3)",
    pulse: false,
  },
  SELL: {
    label: "SELL",
    color: "var(--rating-sell)",
    glow: "0 0 20px rgba(255, 140, 66, 0.4)",
    bg: "rgba(255, 140, 66, 0.08)",
    border: "rgba(255, 140, 66, 0.3)",
    pulse: false,
  },
  STRONG_SELL: {
    label: "STRONG SELL",
    color: "var(--rating-strong-sell)",
    glow: "0 0 30px rgba(255, 59, 92, 0.5), 0 0 60px rgba(255, 59, 92, 0.2)",
    bg: "rgba(255, 59, 92, 0.08)",
    border: "rgba(255, 59, 92, 0.4)",
    pulse: true,
  },
};

// ---- Confidence Arc (SVG radial gauge) ----
function ConfidenceGauge({ value }: { value: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <motion.circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          transform="rotate(-90 44 44)"
          style={{ color: "var(--accent-cyan)" }}
        />
        <text x="44" y="49" textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontFamily="JetBrains Mono" fontWeight="700">
          {value}
        </text>
      </svg>
      <span className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-widest">Confidence</span>
    </div>
  );
}

// ---- Main Component ----
interface AIRatingProps {
  ticker: string;
  data: AnalysisResult;
  isLoading?: boolean;
}

export function AIRating({ ticker, data, isLoading }: AIRatingProps) {
  const [bullOpen, setBullOpen] = useState(false);
  const [bearOpen, setBearOpen] = useState(false);

  if (isLoading) {
    return <AIRatingSkeleton />;
  }

  const config = RATING_CONFIG[data.rating];
  const upsidePositive = data.upside >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl p-6 space-y-6"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid var(--border-subtle)`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] font-mono mb-1">AI Analyst Rating</p>
          <p className="text-sm text-[var(--text-muted)] font-mono">{ticker} · {data.targetHorizon}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
          Powered by Gemini 2.5 Pro
        </span>
      </div>

      {/* Rating Badge + Confidence + Price Target */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Badge */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
          className="flex-1 flex items-center justify-center py-5 px-8 rounded-xl"
          style={{
            background: config.bg,
            border: `1px solid ${config.border}`,
            boxShadow: config.pulse ? config.glow : "none",
          }}
        >
          <span
            className="text-3xl font-bold tracking-wider font-mono"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
        </motion.div>

        {/* Confidence Gauge */}
        <ConfidenceGauge value={data.confidence} />

        {/* Price Target */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-mono">Price Target</span>
          <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">
            ${data.priceTarget.toFixed(2)}
          </span>
          <span
            className="text-sm font-mono font-semibold"
            style={{ color: upsidePositive ? "var(--accent-green)" : "var(--accent-red)" }}
          >
            {upsidePositive ? "▲" : "▼"} {Math.abs(data.upside).toFixed(1)}% upside
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed border-l-2 pl-4" style={{ borderColor: config.border }}>
        {data.summary}
      </p>

      {/* Valuation + Technicals + Sector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Valuation", value: data.valuation },
          { label: "Technicals", value: data.technicals },
          { label: "Sector", value: data.sectorContext },
        ].map((item) => (
          <div key={item.label} className="rounded-lg p-3" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-mono mb-1">{item.label}</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Bull Case Accordion */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,255,135,0.15)" }}>
        <button
          onClick={() => setBullOpen(!bullOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
          style={{ background: "rgba(0,255,135,0.05)", color: "var(--rating-strong-buy)" }}
        >
          <span>▲ Bull Case ({data.bullCase.length} points)</span>
          <span>{bullOpen ? "−" : "+"}</span>
        </button>
        <AnimatePresence>
          {bullOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 space-y-2"
            >
              {data.bullCase.map((point, i) => (
                <li key={i} className="flex gap-2 text-xs text-[var(--text-secondary)]">
                  <span style={{ color: "var(--rating-buy)" }}>•</span>
                  {point}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Bear Case Accordion */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,59,92,0.15)" }}>
        <button
          onClick={() => setBearOpen(!bearOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
          style={{ background: "rgba(255,59,92,0.05)", color: "var(--rating-strong-sell)" }}
        >
          <span>▼ Bear Case ({data.bearCase.length} points)</span>
          <span>{bearOpen ? "−" : "+"}</span>
        </button>
        <AnimatePresence>
          {bearOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 space-y-2"
            >
              {data.bearCase.map((point, i) => (
                <li key={i} className="flex gap-2 text-xs text-[var(--text-secondary)]">
                  <span style={{ color: "var(--rating-sell)" }}>•</span>
                  {point}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Key Risks + Catalysts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-mono mb-2">Key Risks</p>
          <div className="flex flex-wrap gap-2">
            {data.keyRisks.map((risk, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full font-mono" style={{ background: "rgba(255,59,92,0.1)", color: "var(--rating-sell)", border: "1px solid rgba(255,59,92,0.2)" }}>
                {risk}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-mono mb-2">Catalysts</p>
          <div className="flex flex-wrap gap-2">
            {data.catalysts.map((cat, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full font-mono" style={{ background: "rgba(0,212,255,0.1)", color: "var(--accent-cyan)", border: "1px solid rgba(0,212,255,0.2)" }}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-[var(--text-muted)] text-center pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        AI-generated analysis via Gemini 2.5 Pro · Not financial advice · Always do your own research
        {data.lastUpdated && (
          <span className="block mt-1 font-mono">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </span>
        )}
      </p>
    </motion.div>
  );
}

// ---- Skeleton ----
export function AIRatingSkeleton() {
  return (
    <div className="rounded-2xl p-6 space-y-4 animate-pulse" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
      <div className="h-4 w-32 rounded bg-[var(--bg-elevated)]" />
      <div className="h-20 rounded-xl bg-[var(--bg-elevated)]" />
      <div className="h-4 w-full rounded bg-[var(--bg-elevated)]" />
      <div className="h-4 w-3/4 rounded bg-[var(--bg-elevated)]" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16 rounded-lg bg-[var(--bg-elevated)]" />
        <div className="h-16 rounded-lg bg-[var(--bg-elevated)]" />
        <div className="h-16 rounded-lg bg-[var(--bg-elevated)]" />
      </div>
    </div>
  );
}
```

---

## STEP 10 — Wire Into Stock Page

In `/app/stock/[ticker]/page.tsx`, integrate the AI rating section:

```tsx
// Add this import
import { AIRating, AIRatingSkeleton } from "@/components/stock/AIRating";
import { useStockAnalysis } from "@/hooks/useStockAnalysis";

// Inside your stock page component, after existing data is loaded:
const { data: analysis, isLoading: analysisLoading, error: analysisError } = useStockAnalysis(
  ticker,
  stockData ?? null,   // Pass the fundamentals object from Phase 2
  !!stockData          // Only fire once stock data is loaded
);

// In JSX, add the AIRating section after the price chart:
<section>
  <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "DM Serif Display" }}>
    AI Analyst Rating
  </h2>
  {analysisLoading && <AIRatingSkeleton />}
  {analysis && !analysisLoading && (
    <AIRating ticker={ticker} data={analysis} />
  )}
  {analysisError && !analysisLoading && (
    <div className="rounded-xl p-4 text-sm text-[var(--text-secondary)]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
      AI analysis unavailable. Please try refreshing.
    </div>
  )}
</section>
```

---

## STEP 11 — Add to Vercel Environment Variables

Go to your Vercel project → Settings → Environment Variables → Add:

```
Name:  OPENROUTER_API_KEY
Value: sk-or-your-key-here
Environments: Production, Preview, Development (check all three)
```

Then **redeploy** (Vercel → Deployments → Redeploy latest).

---

## CHECKLIST BEFORE MARKING PHASE 4 COMPLETE

- [ ] `OPENROUTER_API_KEY` set in both `.env.local` and Vercel dashboard
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `/api/analyze` returns valid JSON when called with a real ticker (test with `curl` or Postman)
- [ ] AI rating badge renders correctly for STRONG_BUY, HOLD, and STRONG_SELL (test AAPL, TSLA, and a distressed stock)
- [ ] Skeleton loader appears while analysis is loading
- [ ] Fallback "HOLD" renders gracefully if the API key is wrong or OpenRouter is down
- [ ] Rate limit (5 req/min) blocks the 6th request with a 429 response
- [ ] LRU cache returns `"cached": true` on second request for same ticker within 15 min
- [ ] Disclaimer is visible on all screen sizes
- [ ] Mobile layout renders correctly at 375px width

---

## COST ESTIMATE

| Usage | Cost |
|---|---|
| 1 analysis (avg ~3,000 tokens in + ~600 out) | ~$0.004 |
| 100 analyses/day | ~$0.40/day |
| 1,000 analyses/day | ~$4.00/day |

With the 15-minute server cache + 14-minute client cache, real cost for typical usage is a fraction of these figures.
