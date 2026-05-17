# Claude Code Prompt: Stock Analysis Dashboard (Valantié-Grade)

---

## PROJECT OVERVIEW

Build a **production-grade, full-stack Stock Analysis Dashboard** as a Next.js 15 App Router application deployable on Vercel. The dashboard allows users to search any stock ticker and receive a comprehensive analyst-grade view including financial metrics, AI-generated ratings, chart data, news sentiment, and more — styled as a premium financial intelligence platform (think Bloomberg Terminal meets modern SaaS, not generic finance clones).

---

## TECH STACK

- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + CSS Variables for theme tokens
- **Animation**: Framer Motion (for all transitions, number counters, chart reveals, skeleton loaders)
- **Charts**: Recharts or TradingView Lightweight Charts (for candlestick/price charts)
- **State Management**: Zustand (global state for watchlist, settings)
- **Data Fetching**: TanStack Query v5 (server-side + client-side)
- **API Layer**: Next.js Route Handlers (App Router `/app/api/`)
- **Font**: Use `next/font` — pair a distinctive display font (e.g. DM Serif Display or Playfair Display) with a mono/data font (e.g. JetBrains Mono or IBM Plex Mono) for ticker data
- **Deployment**: Vercel (edge-ready, with environment variables)
- **Security**: OWASP Top 10 compliant (see Security section)

---

## DATA SOURCES (FREE-TIER FIRST, THEN FALLBACK)

Use the following APIs. Implement a unified API abstraction layer (`/lib/market-data/`) so providers can be swapped:

1. **Yahoo Finance** (via `yahoo-finance2` npm package) — primary source for quotes, fundamentals, earnings, historical data
2. **Alpha Vantage** (free key) — fallback for OHLCV, RSI, MACD, SMA/EMA indicators
3. **Financial Modeling Prep (FMP)** — for analyst ratings, DCF valuation, financial statements
4. **NewsAPI or Finnhub** — for real-time company news with sentiment tagging
5. **FRED (Federal Reserve)** — for macro context (interest rates, CPI, unemployment)

Store all API keys **exclusively in `.env.local`** and expose them only through server-side Route Handlers. Never expose keys to the client.

---

## DESIGN SYSTEM & AESTHETIC

### Theme
- **Color Scheme**: Dark-primary design with a near-black base (`#0A0A0F`), subtle cool-gray card surfaces (`#12121A`), and a vibrant **electric blue-green accent** (`#00D4FF` / `#00FFB2`) for positive indicators, red (`#FF3B5C`) for negative, gold (`#FFD166`) for neutral/hold
- **Typography**:
  - Display/Headers: `DM Serif Display` (elegant, financial report feel)
  - Body/UI: `Inter` or `Outfit` (clean readability)
  - Numbers/Tickers/Data: `JetBrains Mono` (monospaced, terminal-accurate)
- **Visual Language**: Glassmorphism cards with `backdrop-filter: blur()`, ultra-thin borders (`1px solid rgba(255,255,255,0.07)`), layered depth via box-shadows
- **Motion Principles**:
  - All page transitions: fade + slide up (150ms ease-out)
  - Number counters: animate from 0 to value on load (Framer Motion `useMotionValue` + spring)
  - Skeleton loaders on every data card (pulse animation while fetching)
  - Rating badge: scale + glow entrance animation
  - Chart area: draws in from left on mount
  - Hover states: subtle scale (1.01) + shadow lift on all interactive cards
  - Staggered card reveal: each metric card appears 50ms after the previous

### Layout
- **Desktop**: Left sidebar (watchlist + navigation) + main content (3-column grid) + optional right panel (news feed)
- **Mobile**: Bottom tab navigation, single-column stacked cards, swipeable chart fullscreen
- **Breakpoints**: Mobile-first. `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px

---

## FEATURE REQUIREMENTS

### 1. GLOBAL SEARCH (Hero Feature)
- Floating command-palette style search (`⌘K` shortcut on desktop)
- Full-screen overlay on mobile with search input auto-focused
- Typeahead autocomplete with stock name + ticker + exchange badge
- Recent searches persisted in `localStorage` (sanitized)
- Keyboard navigation (arrow keys + Enter) through suggestions
- Show exchange flag (NYSE, NASDAQ, NSE, BSE, LSE, etc.)

### 2. STOCK OVERVIEW HEADER
When a stock is selected, render a sticky header containing:
- Company name + ticker symbol + exchange
- Current price (large, monospaced) with live delta ($ and %) since market open
- Color-coded arrow indicator (up = green, down = red)
- Market status pill: `OPEN` (pulsing green dot) / `CLOSED` / `PRE-MARKET` / `AFTER-HOURS`
- 52-week range bar (visual slider showing current price position)
- Market cap, P/E Ratio, Volume (formatted: 1.2B, 340M, etc.)
- Company logo (fetched from Clearbit Logo API or fallback to initials avatar)

### 3. AI ANALYST RATING (Core Differentiator)
This is the most important feature. Build a dedicated rating module:

**Endpoint**: `POST /api/analyze` — calls Claude Sonnet via Anthropic SDK server-side

**Rating System**: `STRONG BUY` | `BUY` | `HOLD` | `SELL` | `STRONG SELL`

**Rating Logic** — the AI prompt must instruct Claude to evaluate:
- Valuation metrics (P/E, P/B, P/S, EV/EBITDA vs sector average)
- Growth trajectory (Revenue YoY, EPS growth, forward guidance)
- Profitability (Gross margin, Operating margin, Net margin trends)
- Balance sheet health (Debt/Equity, Current ratio, Quick ratio, Interest coverage)
- Cash flow quality (FCF yield, FCF/Net income ratio, CapEx trend)
- Technical posture (Price vs 50MA, 200MA, RSI, MACD signal)
- Analyst consensus (Wall Street price target vs current price, # of buy/hold/sell ratings)
- Momentum & sentiment (short float %, institutional ownership changes, insider transactions)
- Macro exposure (sector rotation context, interest rate sensitivity, cyclicality)

**Output Format** from Claude (structured JSON):
```json
{
  "rating": "BUY",
  "confidence": 78,
  "priceTarget": 215.40,
  "targetHorizon": "12 months",
  "upside": 14.2,
  "summary": "3-sentence plain English rationale",
  "bullCase": ["point 1", "point 2", "point 3"],
  "bearCase": ["point 1", "point 2", "point 3"],
  "keyRisks": ["risk 1", "risk 2"],
  "catalysts": ["catalyst 1", "catalyst 2"],
  "valuation": "Slightly undervalued vs sector median",
  "technicals": "Neutral — consolidating above 200-day MA",
  "lastUpdated": "ISO timestamp"
}
```

**UI for Rating**:
- Large centered badge with color-coded glow:
  - STRONG BUY: emerald green + outer glow
  - BUY: teal green
  - HOLD: amber/gold
  - SELL: orange-red
  - STRONG SELL: bright red + pulsing border
- Confidence score shown as a radial arc/gauge
- Price target with upside % displayed prominently
- Expandable bull/bear case accordion
- Key risks as dismissible chip tags
- Catalysts as timeline dots
- Disclaimer footer: "AI-generated analysis. Not financial advice."
- Cache AI response for 15 minutes per ticker (server-side in-memory or Vercel KV)

### 4. INTERACTIVE PRICE CHART
- Implement using **TradingView Lightweight Charts** (`lightweight-charts` npm)
- Time range selector: `1D` `5D` `1M` `3M` `6M` `1Y` `2Y` `5Y` `MAX`
- Chart types toggle: **Line** | **Candlestick** | **Area**
- Overlay toggles: `SMA 20` `SMA 50` `SMA 200` `EMA 12` `EMA 26` `Bollinger Bands`
- Volume bars in sub-chart below price chart
- MACD and RSI panels (togglable below chart)
- Crosshair with OHLCV tooltip on hover
- Chart fully responsive (resize observer)
- Watermark with ticker symbol subtly in chart background
- Dark theme matching the overall app palette

### 5. FINANCIAL METRICS GRID
Organize into tabbed sections:

**Tab 1: Valuation**
- P/E Ratio (TTM + Forward)
- P/B Ratio
- P/S Ratio
- EV/EBITDA
- EV/Revenue
- PEG Ratio
- Dividend Yield + Payout Ratio
- Compare each metric vs sector median (visual bar comparison)

**Tab 2: Financials**
- Revenue (quarterly + annual bar chart, YoY growth %)
- Gross Profit + Gross Margin %
- Operating Income + Operating Margin %
- Net Income + Net Margin %
- EPS (Diluted TTM + Forward estimates)
- EBITDA
- R&D Expense (if applicable)

**Tab 3: Balance Sheet**
- Total Assets vs Total Liabilities (stacked bar)
- Shareholders Equity
- Cash & Cash Equivalents
- Total Debt + Net Debt
- Debt/Equity Ratio
- Current Ratio + Quick Ratio
- Goodwill & Intangibles

**Tab 4: Cash Flow**
- Operating Cash Flow
- Free Cash Flow
- CapEx
- FCF Yield
- FCF/Net Income ratio
- Share buybacks + Dividends paid

**Tab 5: Growth**
- Revenue growth (1Y, 3Y, 5Y CAGR)
- EPS growth (1Y, 3Y, 5Y CAGR)
- Book value per share growth
- Dividend growth rate

All metrics rendered as animated stat cards with mini sparkline indicators.

### 6. ANALYST CONSENSUS PANEL
- Wall Street analyst ratings breakdown: pie/donut chart (Buy / Hold / Sell counts)
- Average 12-month price target + high/low target
- Price target distribution: horizontal dot plot showing all analyst targets
- Recent rating changes timeline (upgrade/downgrade feed)
- EPS estimate vs actual (earnings surprise chart — bar chart)
- Next earnings date countdown pill

### 7. NEWS & SENTIMENT FEED
- Latest 10–15 news articles for the stock
- Each article card: source logo, headline, time ago, sentiment badge (`Positive` / `Neutral` / `Negative`)
- Sentiment colored left-border on card
- Click to open article in new tab (rel="noopener noreferrer")
- Aggregate sentiment score for last 7 days (horizontal meter)
- Insider transactions feed (buy/sell by executives with $ value and date)
- SEC filing alerts (10-K, 10-Q, 8-K) as a mini feed

### 8. WATCHLIST (Persistent)
- Saved in Zustand + `localStorage` (sanitized/validated before write)
- Add/remove ticker from any stock view
- Sidebar watchlist shows: ticker, price, % change with color
- Drag-to-reorder (use `@dnd-kit/core`)
- Max 30 stocks in watchlist
- Clicking any watchlist item loads that stock

### 9. MARKET OVERVIEW (Home Screen / No Stock Selected)
When no stock is searched, show:
- Major indices: S&P 500, NASDAQ, DOW, FTSE 100, NIFTY 50, SENSEX (if targeting India/Sri Lanka too)
- Crypto overview: BTC, ETH, BNB with price + % change
- Top Gainers / Top Losers (5 each)
- Most Active stocks
- Fear & Greed Index (fetched from CNN Money API or computed)
- Economic calendar: upcoming earnings dates + macro events
- Market heat map (sector performance grid, color-coded)

### 10. SETTINGS & PREFERENCES
- Light / Dark mode toggle (system preference default, persisted)
- Currency display (USD, INR, LKR, GBP, EUR)
- Default chart type preference
- API key management UI (users can optionally bring their own FMP/Alpha Vantage keys — stored encrypted in localStorage, never sent to server logs)
- Notification: "Data is delayed 15 minutes for free tier" banner (dismissible, shown once)

---

## ROUTING STRUCTURE (App Router)

```
app/
├── layout.tsx                    # Root layout (fonts, providers, analytics)
├── page.tsx                      # Market overview / home
├── stock/
│   └── [ticker]/
│       ├── page.tsx              # Main stock dashboard
│       ├── loading.tsx           # Full skeleton loader
│       └── error.tsx             # Error boundary with retry
├── api/
│   ├── stock/[ticker]/
│   │   ├── quote/route.ts        # Real-time quote
│   │   ├── fundamentals/route.ts # Key stats + ratios
│   │   ├── financials/route.ts   # Income, balance sheet, CF
│   │   ├── historical/route.ts   # OHLCV data
│   │   ├── news/route.ts         # News + sentiment
│   │   ├── analysts/route.ts     # Analyst ratings + targets
│   │   └── insider/route.ts      # Insider transactions
│   ├── analyze/route.ts          # AI rating endpoint (Claude API call)
│   ├── search/route.ts           # Ticker autocomplete
│   └── market/
│       ├── overview/route.ts     # Indices, movers
│       └── sectors/route.ts      # Sector performance
└── providers.tsx                 # TanStack Query + Zustand provider wrapper
```

---

## SECURITY (OWASP Top 10 Compliance)

Implement the following explicitly:

### A01 – Broken Access Control
- All data API routes are server-side only (Route Handlers). No client-side API key usage.
- Rate limiting on all `/api/` routes using `@upstash/ratelimit` with Vercel KV (or in-memory fallback): 30 requests/minute per IP for quotes, 5 requests/minute for AI analysis.
- Implement `middleware.ts` to enforce rate limits globally.

### A02 – Cryptographic Failures
- All environment variables (API keys) stored in Vercel Environment Variables, never hardcoded.
- HTTPS enforced via Vercel (no HTTP fallback).
- If storing user preferences with any sensitive data: use Web Crypto API to encrypt before writing to localStorage.
- Implement `Content-Security-Policy` headers in `next.config.ts`.

### A03 – Injection
- All user inputs (search queries, ticker symbols) validated and sanitized server-side using `zod` schema validation before any API call or DB query.
- Ticker symbols: validate against regex `/^[A-Z0-9\.\-]{1,10}$/` before processing.
- No `dangerouslySetInnerHTML` usage anywhere.
- SQL injection: N/A (no DB), but if added later — use parameterized queries only.

### A04 – Insecure Design
- Defense in depth: validate inputs at both client and server.
- AI analysis endpoint: validate ticker exists before calling Claude API (prevent prompt injection via ticker input).
- Sanitize all news article titles/summaries before rendering (use DOMPurify or `sanitize-html`).

### A05 – Security Misconfiguration
- Implement security headers in `next.config.ts`:
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: (restrict to known domains)
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  ```
- Disable `x-powered-by` header.
- All errors: return generic messages to client, log details server-side only.

### A06 – Vulnerable Components
- Run `npm audit` and fix all critical/high vulnerabilities before shipping.
- Pin all dependency versions in `package.json`.
- Add `dependabot.yml` for automated security updates.

### A07 – Authentication Failures
- App is currently read-only public (no auth required for MVP).
- If auth added later: use NextAuth.js v5 with OAuth only (Google/GitHub), never username/password.
- Session tokens: `httpOnly`, `secure`, `sameSite: strict` cookies.

### A08 – Software and Data Integrity
- Verify external API responses with Zod schemas before rendering — malformed responses throw typed errors, never crash the UI.
- Implement `integrity` attribute on any CDN-loaded assets.
- Subresource integrity for any externally loaded scripts.

### A09 – Logging and Monitoring
- Use Vercel's built-in logging for server errors.
- Client-side: implement error boundary at root level with fallback UI.
- Log all API errors server-side with timestamp, route, sanitized input (no PII).
- Never log API keys, user data, or full request bodies.

### A10 – SSRF (Server-Side Request Forgery)
- All external API calls go to a pre-approved allowlist of domains (Yahoo Finance, Alpha Vantage, FMP, Finnhub, NewsAPI).
- Validate and allowlist all outbound URLs in the data layer.
- Never accept a URL from user input for server-side fetching.

---

## PERFORMANCE REQUIREMENTS

- **Core Web Vitals target**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Use `next/image` for all images (company logos, source logos)
- Implement React Suspense boundaries on every data section (show skeleton, not spinner)
- Static Shell: page shell renders instantly; data hydrates progressively
- API route caching: quote data cached 60 seconds, fundamentals 1 hour, financials 24 hours (use `next: { revalidate: N }` in fetch calls)
- AI analysis: cache per ticker for 15 minutes (Vercel KV or in-memory LRU cache with `lru-cache`)
- Bundle optimization: dynamic imports for chart library and heavy components
- Prefetch watchlist tickers in the background on app load

---

## COMPONENT ARCHITECTURE

Create these reusable components in `/components/`:

```
components/
├── ui/
│   ├── MetricCard.tsx          # Animated stat card with label, value, delta, sparkline
│   ├── RatingBadge.tsx         # Animated buy/sell/hold badge with glow
│   ├── PriceChange.tsx         # Colored price + % change display
│   ├── SkeletonCard.tsx        # Pulse skeleton loader
│   ├── SectionTabs.tsx         # Smooth animated tab switcher
│   ├── DataTable.tsx           # Sortable financial data table
│   ├── MiniSparkline.tsx       # Tiny inline sparkline chart
│   └── TooltipWrapper.tsx      # Consistent tooltip system
├── charts/
│   ├── PriceChart.tsx          # Main TradingView chart
│   ├── RevenueChart.tsx        # Bar chart for revenue
│   ├── AnalystDonut.tsx        # Analyst consensus donut
│   └── FinancialBar.tsx        # Generic financial bar chart
├── stock/
│   ├── StockHeader.tsx         # Ticker header with price + status
│   ├── AIRating.tsx            # AI rating module
│   ├── FinancialsGrid.tsx      # Tabbed financials section
│   ├── NewsFeed.tsx            # News + sentiment feed
│   ├── AnalystPanel.tsx        # Wall Street consensus
│   └── InsiderFeed.tsx         # Insider transactions
├── search/
│   ├── SearchBar.tsx           # Main search input
│   ├── SearchOverlay.tsx       # Full-screen search modal
│   └── SearchResult.tsx        # Individual autocomplete result
├── layout/
│   ├── Sidebar.tsx             # Desktop sidebar with watchlist
│   ├── BottomNav.tsx           # Mobile bottom tab bar
│   ├── Header.tsx              # Top bar
│   └── ThemeToggle.tsx
└── market/
    ├── MarketOverview.tsx      # Home screen indices
    ├── TopMovers.tsx           # Gainers/Losers
    └── HeatMap.tsx             # Sector heatmap
```

---

## ENVIRONMENT VARIABLES

Create `.env.local` with:
```bash
# Data APIs
YAHOO_FINANCE_ENABLED=true
ALPHA_VANTAGE_API_KEY=your_key
FMP_API_KEY=your_key
FINNHUB_API_KEY=your_key
NEWS_API_KEY=your_key

# AI
ANTHROPIC_API_KEY=your_key

# Caching (Vercel KV — optional for MVP, falls back to in-memory)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=30
RATE_LIMIT_WINDOW_MS=60000

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_DATA_DISCLAIMER="Market data may be delayed up to 15 minutes."
```

---

## AI RATING PROMPT (For Claude API Call)

In `/app/api/analyze/route.ts`, use this system prompt:

```
You are a senior equity research analyst at a top-tier investment bank. You provide rigorous, data-driven stock analysis based purely on fundamentals, technicals, and market context.

Given the following financial data for {TICKER}, provide a structured investment rating.

Your rating must be one of: STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL

Base your analysis on:
1. Valuation vs sector peers and historical averages
2. Revenue and earnings growth trajectory (current + estimates)
3. Profit margin trends and quality of earnings
4. Balance sheet strength and debt serviceability
5. Free cash flow generation and capital allocation
6. Technical setup (price vs moving averages, RSI, momentum)
7. Analyst consensus vs your independent view
8. Key risks that could derail the thesis
9. Potential catalysts for price movement in next 12 months

Respond ONLY with a valid JSON object matching this exact schema. No preamble, no explanation outside the JSON:
{
  "rating": "BUY",
  "confidence": 72,
  "priceTarget": 0.00,
  "targetHorizon": "12 months",
  "upside": 0.0,
  "summary": "...",
  "bullCase": ["...", "...", "..."],
  "bearCase": ["...", "...", "..."],
  "keyRisks": ["...", "..."],
  "catalysts": ["...", "..."],
  "valuation": "...",
  "technicals": "...",
  "lastUpdated": "ISO timestamp"
}
```

Validate the JSON response with Zod before returning it to the client. If Claude returns invalid JSON, retry once, then return a fallback "HOLD" rating with an error flag.

---

## FILE STRUCTURE (Complete)

```
├── app/
├── components/
├── lib/
│   ├── market-data/
│   │   ├── index.ts            # Unified data adapter
│   │   ├── yahoo.ts            # Yahoo Finance adapter
│   │   ├── alpha-vantage.ts    # Alpha Vantage adapter
│   │   └── fmp.ts              # FMP adapter
│   ├── ai/
│   │   ├── analyzer.ts         # Claude API wrapper
│   │   └── prompts.ts          # Prompt templates
│   ├── cache/
│   │   └── index.ts            # LRU cache or Vercel KV
│   ├── security/
│   │   ├── rate-limit.ts       # Rate limiting logic
│   │   ├── sanitize.ts         # Input sanitization
│   │   └── headers.ts          # Security headers config
│   ├── utils/
│   │   ├── format.ts           # Currency, number, date formatters
│   │   └── validators.ts       # Zod schemas
│   └── store/
│       └── watchlist.ts        # Zustand store
├── public/
├── styles/
│   └── globals.css             # CSS variables + base styles
├── middleware.ts               # Rate limiting + security headers
├── next.config.ts              # Security headers + optimizations
├── tailwind.config.ts
└── package.json
```

---

## DEVELOPMENT PHASES

### Phase 1 — Foundation (Start Here)
1. Initialize Next.js 15 project with TypeScript + Tailwind + App Router
2. Set up design system (CSS variables, fonts, color tokens in `globals.css`)
3. Build layout shell: Sidebar + Header + BottomNav (responsive)
4. Implement Search component (UI only, mock data)
5. Implement security headers in `next.config.ts` and `middleware.ts`

### Phase 2 — Data Layer
6. Implement Yahoo Finance adapter (`yahoo-finance2`)
7. Build all API route handlers (`/api/stock/[ticker]/...`)
8. Add Zod validation on all routes
9. Implement rate limiting in middleware
10. Add LRU cache for API responses

### Phase 3 — Core Dashboard UI
11. Build StockHeader component
12. Build MetricCard grid (animated)
13. Implement TradingView price chart
14. Build FinancialsGrid with tabs + charts
15. Add skeleton loaders for all sections

### Phase 4 — AI Rating
16. Implement Claude API integration (`/api/analyze`)
17. Build AIRating component with animations + badge
18. Add per-ticker caching for AI responses
19. Add retry logic + fallback handling

### Phase 5 — Extended Features
20. News feed + sentiment tagging
21. Analyst consensus panel + charts
22. Insider transactions feed
23. Market overview home screen
24. Watchlist with drag-to-reorder

### Phase 6 — Polish & Deploy
25. Add Framer Motion to all sections (staggered reveal)
26. Light/Dark mode + theme persistence
27. `npm audit` + fix vulnerabilities
28. Performance optimization (bundle analysis, lazy loading)
29. Deploy to Vercel + set environment variables
30. End-to-end test on mobile + desktop

---

## QUALITY BAR

- **Zero `any` in TypeScript** — fully typed throughout
- **Zero inline styles** — all styling through Tailwind or CSS variables
- **Zero hardcoded API keys** — all in `.env.local`
- **Every API route has**: input validation (Zod), error handling, rate limiting, correct HTTP status codes
- **Every component has**: loading state, error state, empty state handled
- **Mobile-first**: test every feature at 375px width first
- **Accessibility**: all interactive elements have aria labels, keyboard navigable
- Charts are responsive and re-render correctly on window resize

---

## NOTES FOR CLAUDE CODE

- Start with `npx create-next-app@latest stockvision --typescript --tailwind --app --src-dir=false`
- Use `npm` (not yarn or pnpm) unless specified otherwise
- Ask for API keys before starting Phase 2 — provide a setup checklist
- When building the AI rating feature, use `@anthropic-ai/sdk` npm package
- The `yahoo-finance2` package works well in Next.js Route Handlers — it does NOT work client-side
- For TradingView Lightweight Charts, use dynamic import with `ssr: false`
- Vercel KV is optional for MVP — implement in-memory LRU cache first (`lru-cache` package), then upgrade to Vercel KV for production persistence
- Run `next build` and fix all TypeScript errors before considering any phase complete

---

*Generated for Valentié Records / Jaden Christy — Stock Analysis Platform*
*Reference aesthetic: Bloomberg Terminal × Linear × Vercel Dashboard*
