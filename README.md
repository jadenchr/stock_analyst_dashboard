# StockVision

> Analyst-grade stock intelligence dashboard — Bloomberg Terminal × Linear × Vercel.
> Live coverage of US, India (NSE / BSE), Sri Lanka (CSE), UK, and crypto.

Built with Next.js 15 (App Router, React 19), TypeScript strict mode, Tailwind CSS,
Framer Motion, TanStack Query, TradingView Lightweight Charts, Zustand, and Zod.

---

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | UI foundation, layout, search, security headers | ✅ shipped |
| 2 | `/api/*` routes, provider adapters, LRU cache, rate limiting | ✅ shipped |
| 3 | TradingView chart, MetricCard grid, FinancialsGrid tabs, AnalystPanel | ✅ shipped |
| 4 | Claude AI rating endpoint + live `AIRating` UI | requires `ANTHROPIC_API_KEY` |
| 5 | News + sentiment, insider, drag-watchlist, sector heatmap, top movers | ✅ shipped |
| 6 | Multi-exchange (BSE/NSE/CSE), theme persistence, audit, bundle, deploy | ✅ shipped |

---

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in the 3 free-tier keys
npm run dev                        # → http://localhost:3000
```

Production build:

```bash
npm run type-check
npm run build
npm start

# bundle visualization
npm run analyze
```

Node 20+ required.

---

## Exchange coverage

| Exchange | Ticker pattern | Data source | Live quote | Fundamentals | History | News | Insider | Analysts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **US (NYSE / NASDAQ)** | `AAPL`, `BRK.B` | Yahoo + Finnhub + Alpha Vantage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **India NSE** | `RELIANCE.NS`, `TCS.NS` | Yahoo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **India BSE** | `RELIANCE.BO` | Yahoo | ✅ | ✅ | ✅ | ✅ | partial | partial |
| **Sri Lanka CSE** | `JKH.N0000`, `COMB.N0000` | cse.lk (free-tier) | ✅ | — | — | via NewsAPI | — | — |
| **UK LSE** | `BARC.L`, `^FTSE` | Yahoo | ✅ | ✅ | ✅ | ✅ | partial | partial |
| **Crypto** | `BTC-USD`, `ETH-USD` | Yahoo | ✅ | n/a | ✅ | ✅ | n/a | n/a |

CSE coverage is limited by free-tier provider availability — the stock detail page surfaces an honest "data limited" notice and only renders the sections that can be filled.

---

## What's on screen

**Home** (`/`) — Hero → Global indices (now including SENSEX + CSE ASPI when CSE returns data) → Sector heatmap (11 SPDR ETFs) → Today's biggest movers → Popular US tickers → **Regional spotlight: India + Sri Lanka** → Roadmap.

**Stock** (`/stock/[ticker]`) — Live header with 52-week range bar → KPI grid → TradingView chart (9 ranges · 3 types · 6 overlays · volume · crosshair) → AI rating + analyst donut → 5-tab financials (Valuation, Income, Balance, Cash Flow, Growth) → News + sentiment → Insider activity.

**Watchlist** (`/watchlist`) — Drag-to-reorder full-table view with live quote polling. Same dataset in sidebar.

**Other** — `/movers`, `/news`, `/screener`, `/settings`.

---

## API surface

All routes server-side, Zod-validated, LRU-cached, rate-limited (`X-RateLimit-*` headers).

| Route | Source | TTL | Limit |
|---|---|---|---|
| `GET /api/search?q=` | Yahoo + CSE (merged) | 10m | 30/min |
| `GET /api/market/overview` | Yahoo | 60s | 60/min |
| `GET /api/market/movers` | Yahoo screener | 60s | 60/min |
| `GET /api/market/sectors` | Yahoo (SPDR ETFs) | 60s | 60/min |
| `GET /api/market/regional` | Yahoo (NSE) + CSE | 60s | 30/min |
| `GET /api/stock/[t]/quote` | Yahoo or CSE | 60s | 30/min |
| `GET /api/stock/[t]/fundamentals` | Yahoo (501 for CSE) | 1h | 30/min |
| `GET /api/stock/[t]/financials` | Yahoo (501 for CSE) | 24h | 20/min |
| `GET /api/stock/[t]/historical?range=` | Yahoo | 5m | 30/min |
| `GET /api/stock/[t]/technicals` | Alpha Vantage | 5m | 10/min |
| `GET /api/stock/[t]/news` | Finnhub → NewsAPI | 5m | 30/min |
| `GET /api/stock/[t]/insider` | Finnhub | 1h | 20/min |
| `GET /api/stock/[t]/analysts` | Finnhub | 1h | 20/min |
| `POST /api/analyze` | Claude (stub until Phase 4) | 15m | 5/min |

---

## Theme

Three-way picker (Light · Dark · System) in the header — persisted to localStorage via Zustand.
Pre-hydration script (`public/theme-init.js`) sets the class before paint so there's no flash.
Light mode tokens are tuned for ≥ 4.5:1 contrast and visible borders; bull/bear hues shift darker to stay readable on white.

---

## Deploy to Vercel

```bash
# Connect the repo via Vercel dashboard or:
vercel link
vercel env add ALPHA_VANTAGE_API_KEY
vercel env add FINNHUB_API_KEY
vercel env add NEWS_API_KEY
vercel env add ANTHROPIC_API_KEY   # optional, Phase 4
vercel deploy --prod
```

The included `vercel.json` raises `maxDuration` for the chattier endpoints
(financials, technicals, market overview) since they fan out to multiple
upstream calls. Default region is `iad1` (US East) — change for latency.

---

## Project layout

```
app/
  layout.tsx · providers.tsx · globals.css
  page.tsx                     # Markets home
  stock/[ticker]/              # Live stock dashboard
  watchlist/ · movers/ · news/ · screener/ · settings/
  api/                         # 15 route handlers

components/
  charts/                      # PriceChart (TradingView), Donut, Bars, PeerBar
  layout/                      # Sidebar, Header, BottomNav, ThemeToggle, ThemeProvider
  market/                      # Indices, Movers, Sectors, RegionalSpotlight, Hero
  search/                      # Command palette
  stock/                       # LivePriceHeader, Metrics, Financials/, News, Insider, AI
  settings/                    # Theme settings card
  ui/                          # MetricCard, MiniSparkline, SectionTabs, DataTable, SkeletonBlock
  watchlist/                   # Drag-to-reorder table

lib/
  market-data/                 # Yahoo · Alpha Vantage · Finnhub · NewsAPI · CSE + unified facade
  cache/                       # LRU
  security/                    # rate-limit, sanitize, SSRF allowlist + safeFetch
  api/                         # apiHandler (server) + typed TanStack hooks (client)
  store/                       # Zustand: watchlist, search, theme
  utils/                       # format, validators (Zod), indicators (SMA/EMA/Bollinger)
  hooks/                       # use-debounced-value

public/theme-init.js           # Pre-hydration theme bootstrap (no FOUC)
middleware.ts                  # Edge security headers + path guards
next.config.ts                 # CSP + bundle-analyzer wrapper + outputFileTracingRoot
vercel.json                    # Function timeouts + region pin
```

---

## Security

- All data API routes are server-side only; API keys never leave the server.
- CSP `connect-src` allowlist: yahoo, alphavantage, finnhub, newsapi, anthropic, cse.lk.
- Outbound `safeFetch` enforces the same allowlist + HTTPS-only.
- HSTS, X-Frame-Options: DENY, nosniff, strict referrer policy, Permissions-Policy lockdown.
- All ticker / search input passes through Zod schemas (`/^[A-Z0-9.\-^]{1,12}$/`).
- News headlines + summaries pass through `sanitizeText` (HTML stripped, control chars removed, truncated) before render.
- No `dangerouslySetInnerHTML` — theme bootstrap uses `<script src="/theme-init.js">`.
- `prefers-reduced-motion` honored globally.

**`npm audit`** — Currently 2 moderate transitive CVEs inside Next 15's own bundled
`postcss`. These cannot be fixed without downgrading to Next 9 (regression). The
CVE concerns XSS via untrusted CSS input through PostCSS; we never feed untrusted
CSS to postcss (only author-written + Tailwind-generated). Will resolve when Next
upstream pins a newer postcss. Direct deps are clean.

---

## Font system

| Use | Family | Source |
| --- | --- | --- |
| Display / Headers | **TT Hoves** (paid) → **Plus Jakarta Sans** fallback | next/font/google |
| Body / Data tables | **Roboto** | next/font/google |
| Chart data | **JetBrains Mono** → system monospace | next/font/google |

TT Hoves is commercial (TypeType foundry). The architecture is ready: drop the four
WOFF2s (Regular / Medium / DemiBold / Bold) into `app/fonts/tt-hoves/` and replace the
`Plus_Jakarta_Sans` import in `app/layout.tsx` with `localFont({ src: [...] })`.

---

Built for Valentié Records / Jaden Christy.
