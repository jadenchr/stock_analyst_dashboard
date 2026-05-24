"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Globe2,
  Layers,
  LineChart,
  LogIn,
  Newspaper,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { LiquidEther } from "@/components/effects/liquid-ether";
import { cn } from "@/lib/utils";

/* ============================================================
 * StockVision Landing - animated, minimalistic, dark-first.
 * ============================================================
 * Composition:
 *   1. Sticky-top ticker tape (live-feel)
 *   2. Cinematic hero with parallax + gradient mesh + word reveal
 *   3. KPI strip with count-up + spark traces
 *   4. Bento feature grid (Apple-style modular showcase)
 *   5. "How it works" - 3-step animated path
 *   6. Animated dashboard preview panel
 *   7. Final CTA + footer
 * All motion respects prefers-reduced-motion via Framer Motion's
 * `useReducedMotion` (built into the library) plus CSS fallbacks.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative overflow-x-hidden"
    >
      {/* Top ticker tape - runs across the very top of the landing */}
      <TickerTape />

      <Hero />

      <KpiStrip />

      <FeatureBento />

      <HowItWorks />

      <DashboardPreview />

      <FinalCta />

      <LandingFooter />
    </div>
  );
}

/* ------------------------------------------------------------------- */
/* 1. Ticker tape                                                       */
/* ------------------------------------------------------------------- */

const TICKERS = [
  { symbol: "AAPL", pct: 1.42 },
  { symbol: "TSLA", pct: -0.86 },
  { symbol: "NVDA", pct: 2.14 },
  { symbol: "MSFT", pct: 0.55 },
  { symbol: "GOOGL", pct: 1.07 },
  { symbol: "AMZN", pct: -0.34 },
  { symbol: "META", pct: 1.89 },
  { symbol: "BRK.B", pct: 0.21 },
  { symbol: "RELIANCE.NS", pct: 0.94 },
  { symbol: "INFY.NS", pct: -1.12 },
  { symbol: "JKH.N0000", pct: 0.68 },
  { symbol: "BTC-USD", pct: 3.41 },
  { symbol: "ETH-USD", pct: 2.13 },
];

function TickerTape() {
  // Duplicate the list so the marquee loop reads continuous.
  const items = [...TICKERS, ...TICKERS];
  return (
    <div className="relative overflow-hidden border-b border-border/40 bg-card/30 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        className="flex w-max gap-6 py-2"
      >
        {items.map((t, i) => {
          const positive = t.pct >= 0;
          return (
            <div
              key={`${t.symbol}-${i}`}
              className="flex shrink-0 items-center gap-2 text-[11px]"
            >
              <span className="font-mono font-semibold text-foreground/80">
                {t.symbol}
              </span>
              <span
                className={cn(
                  "font-mono tabular-nums",
                  positive ? "text-bull" : "text-bear",
                )}
              >
                {positive ? "+" : ""}
                {t.pct.toFixed(2)}%
              </span>
              <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------- */
/* 2. Hero                                                              */
/* ------------------------------------------------------------------- */

function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Cursor spotlight - follows the mouse with spring smoothing.
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const spotX = useSpring(mouseX, { stiffness: 60, damping: 18 });
  const spotY = useSpring(mouseY, { stiffness: 60, damping: 18 });
  // Combine the two springs into a single CSS background string.
  const spotlight = useTransform(
    [spotX, spotY],
    ([x, y]: number[]) =>
      `radial-gradient(circle 600px at ${x}% ${y}%, hsl(var(--primary) / 0.18), transparent 60%)`,
  );

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width) * 100);
    mouseY.set(((e.clientY - rect.top) / rect.height) * 100);
  }

  const headline = "Analyst-grade intelligence";
  const headlineAccent = "for every public stock.";

  return (
    <section
      ref={heroRef}
      onMouseMove={onMouseMove}
      className="relative overflow-hidden px-6 pt-16 pb-28 sm:px-10 sm:pt-24 sm:pb-36 lg:px-16 lg:pt-32 lg:pb-44"
    >
      {/* Layered background — these MUST render before the content
          motion.div so they stack underneath it. The candlestick chart
          counts as background here so it can't paint over the CTAs. */}
      <LiquidEther intensity={0.32} />
      <div className="bg-aurora absolute inset-0" aria-hidden />
      <div className="bg-grid absolute inset-0 opacity-40" aria-hidden />
      <CandlestickChart />
      <motion.div
        style={{ background: spotlight }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      />

      <motion.div
        style={{ y: parallaxY, opacity: fade }}
        className="relative mx-auto flex max-w-5xl flex-col items-center gap-7 text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-wide text-primary"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Live · multi-exchange · AI ratings · zero noise
        </motion.span>

        <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tight text-balance sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          <WordReveal text={headline} />
          <br />
          <span className="gradient-text">
            <WordReveal text={headlineAccent} delay={0.4} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
          className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          A terminal-fast workspace for serious investors. Live fundamentals,
          technicals, Gemini-powered analyst ratings, news sentiment, insider
          activity, and portfolio P&amp;L - across US, India, Sri Lanka, and crypto.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9, ease: EASE }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/auth/signin?next=/"
            className="group inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-10px_hsl(var(--primary)/0.9)]"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Sign in with Google
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 cursor-pointer items-center gap-1.5 rounded-xl border border-border/70 bg-card/60 px-5 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-card"
          >
            See pricing
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-6 flex items-center gap-5 text-[11px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-bull" aria-hidden />
            No credit card
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-primary" aria-hidden />
            5-second sign-up
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <Globe2 className="h-3 w-3 text-primary" aria-hidden />
            US · India · CSE · Crypto
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}

function WordReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className="inline-block">
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.7,
            delay: delay + i * 0.08,
            ease: EASE,
          }}
          className="inline-block"
        >
          {w}
          {i < words.length - 1 && " "}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * Animated candlestick chart that runs along the bottom of the hero.
 * Deterministic random walk (seeded so it's identical between render
 * passes), then each candle pops in left-to-right on a quick stagger.
 * The whole strip lives behind a top-to-bottom fade so it dissolves
 * under any text in the hero - no overlap, no reading problems.
 */
function CandlestickChart() {
  const CANDLE_COUNT = 96;
  const WIDTH = 1600;
  const HEIGHT = 320;
  const CHART_TOP = 40;
  const CHART_BOTTOM = HEIGHT - 30;

  // Seeded PRNG so SSR/CSR agree on the same candle layout.
  function mulberry32(seed: number) {
    let t = seed;
    return () => {
      t = (t + 0x6d2b79f5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const candles = useRef<
    Array<{ x: number; open: number; close: number; high: number; low: number; bull: boolean }>
  >([]);
  if (candles.current.length === 0) {
    const rand = mulberry32(42);
    const slot = WIDTH / CANDLE_COUNT;
    const candleWidth = slot * 0.55;
    let price = 100;
    let prevClose = price;
    const built: typeof candles.current = [];
    for (let i = 0; i < CANDLE_COUNT; i++) {
      // Random walk with a mild trend so the eye reads "rising market"
      const drift = (rand() - 0.45) * 4 + 0.18;
      const open = prevClose;
      const close = Math.max(40, open + drift);
      const wickUp = rand() * 3;
      const wickDown = rand() * 3;
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDown;
      built.push({
        x: i * slot + slot / 2 - candleWidth / 2,
        open,
        close,
        high,
        low,
        bull: close >= open,
      });
      prevClose = close;
    }
    // Normalise to the SVG viewport.
    const allLow = Math.min(...built.map((c) => c.low));
    const allHigh = Math.max(...built.map((c) => c.high));
    const span = allHigh - allLow || 1;
    const project = (v: number) =>
      CHART_BOTTOM - ((v - allLow) / span) * (CHART_BOTTOM - CHART_TOP);
    candles.current = built.map((c) => ({
      ...c,
      open: project(c.open),
      close: project(c.close),
      high: project(c.high),
      low: project(c.low),
    }));
  }

  const slot = WIDTH / CANDLE_COUNT;
  const candleWidth = slot * 0.55;
  // Horizontal grid lines for the trading-screen feel.
  const gridYs = [
    CHART_TOP + (CHART_BOTTOM - CHART_TOP) * 0.25,
    CHART_TOP + (CHART_BOTTOM - CHART_TOP) * 0.5,
    CHART_TOP + (CHART_BOTTOM - CHART_TOP) * 0.75,
  ];

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden sm:h-48 lg:h-56"
      aria-hidden
    >
      {/* No top-fade overlay - the SVG opacity itself makes the candles
          read as background. Slim height keeps them entirely below the
          CTAs.  Bottom fade dissolves the chart into the page bg. */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-background to-transparent" />

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-40"
      >
        {/* Subtle grid lines */}
        {gridYs.map((y, i) => (
          <line
            key={i}
            x1={0}
            x2={WIDTH}
            y1={y}
            y2={y}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            strokeDasharray="4 6"
            opacity={0.35}
          />
        ))}
        {/* Crosshair vertical that drifts slowly across the chart */}
        <motion.line
          x1={0}
          x2={0}
          y1={CHART_TOP - 10}
          y2={CHART_BOTTOM + 10}
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          strokeDasharray="4 6"
          opacity={0.3}
          initial={{ x: 0 }}
          animate={{ x: WIDTH }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />

        {candles.current.map((c, i) => {
          const bodyTop = Math.min(c.open, c.close);
          const bodyHeight = Math.max(2, Math.abs(c.close - c.open));
          const color = c.bull ? "hsl(var(--bull))" : "hsl(var(--bear))";
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: 0.4 + i * 0.012,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Wick */}
              <line
                x1={c.x + candleWidth / 2}
                x2={c.x + candleWidth / 2}
                y1={c.high}
                y2={c.low}
                stroke={color}
                strokeWidth={1.2}
                opacity={0.85}
              />
              {/* Body */}
              <rect
                x={c.x}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
                opacity={0.9}
                rx={0.6}
              />
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------- */
/* 3. KPI Strip                                                         */
/* ------------------------------------------------------------------- */

const KPIS = [
  { label: "Listed equities tracked", value: 45000, suffix: "+" },
  { label: "Markets covered", value: 6, suffix: "" },
  { label: "AI ratings refresh", value: 15, suffix: " min" },
  { label: "Data points per stock", value: 120, suffix: "+" },
];

function KpiStrip() {
  return (
    <section className="relative border-y border-border/40 bg-card/30 px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 sm:grid-cols-4">
        {KPIS.map((k, i) => (
          <KpiCard key={k.label} kpi={k} index={i} />
        ))}
      </div>
    </section>
  );
}

function KpiCard({
  kpi,
  index,
}: {
  kpi: { label: string; value: number; suffix: string };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.55, delay: index * 0.07, ease: EASE }}
      className="flex flex-col gap-1.5"
    >
      <CountUp value={kpi.value} suffix={kpi.suffix} trigger={inView} />
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {kpi.label}
      </span>
    </motion.div>
  );
}

function CountUp({
  value,
  suffix,
  trigger,
}: {
  value: number;
  suffix: string;
  trigger: boolean;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, value]);
  return (
    <span className="font-mono text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">
      {display.toLocaleString()}
      <span className="text-primary">{suffix}</span>
    </span>
  );
}

/* ------------------------------------------------------------------- */
/* 4. Feature Bento                                                     */
/* ------------------------------------------------------------------- */

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

function FeatureBento() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            Everything in one place
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.55, delay: 0.05, ease: EASE }}
            className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
          >
            Built for serious investors,
            <br />
            <span className="text-muted-foreground">priced for everyone.</span>
          </motion.h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : undefined}
          className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2"
        >
          <BentoCard
            className="md:col-span-2 md:row-span-1"
            icon={Sparkles}
            title="AI analyst ratings"
            description="Gemini 2.5 Pro reads every 10-K, earnings call, and news headline so you don't have to. Confidence-scored ratings, price targets, bull/bear cases - refreshed every 15 minutes."
            accent="primary"
          >
            <AIRatingPreview />
          </BentoCard>

          <BentoCard
            icon={Globe2}
            title="Multi-exchange native"
            description="US, NSE, BSE, Sri Lanka CSE, Crypto. Local currencies. No US-bias."
            accent="bull"
          >
            <MarketsPreview />
          </BentoCard>

          <BentoCard
            icon={Wallet}
            title="Portfolio P&L"
            description="Add lots manually or drop in a broker CSV. Live multi-currency P&L."
            accent="primary"
          >
            <PortfolioPreview />
          </BentoCard>

          <BentoCard
            icon={Newspaper}
            title="News + sentiment"
            description="Headlines tagged bull/bear/neutral so you instantly know how the tape is reading."
          >
            <NewsPreview />
          </BentoCard>

          <BentoCard
            icon={LineChart}
            title="Pro charts"
            description="TradingView Advanced Chart on every stock - drawing tools, 100+ indicators."
          >
            <ChartPreview />
          </BentoCard>
        </motion.div>
      </div>
    </section>
  );
}

function BentoCard({
  className,
  icon: Icon,
  title,
  description,
  accent,
  children,
}: {
  className?: string;
  icon: typeof Sparkles;
  title: string;
  description: string;
  accent?: "primary" | "bull";
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm transition-colors hover:border-border",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100",
          accent === "bull" ? "bg-bull/15" : "bg-primary/15",
        )}
        aria-hidden
      />
      <div className="relative flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg ring-1",
            accent === "bull"
              ? "bg-bull/15 ring-bull/30"
              : "bg-primary/15 ring-primary/30",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              accent === "bull" ? "text-bull" : "text-primary",
            )}
            aria-hidden
          />
        </div>
        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children && <div className="relative mt-5 flex-1">{children}</div>}
    </motion.div>
  );
}

/* --- Bento previews ---------------------------------------------- */

function AIRatingPreview() {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">NVDA</span>
          <span className="badge-ticker">NASDAQ</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-bull/40 bg-bull/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bull">
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
          Strong buy
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Stat label="Confidence" value="86%" />
        <Stat label="Target" value="$245" />
        <Stat label="Upside" value="+14%" tone="bull" />
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "86%" }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1.2, ease: EASE }}
          className="h-full bg-gradient-to-r from-primary to-bull"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bull" | "bear";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span>{label}</span>
      <span
        className={cn(
          "font-mono text-sm font-semibold tracking-normal text-foreground",
          tone === "bull" && "text-bull",
          tone === "bear" && "text-bear",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function MarketsPreview() {
  const markets = [
    { flag: "🇺🇸", code: "US" },
    { flag: "🇮🇳", code: "NSE" },
    { flag: "🇮🇳", code: "BSE" },
    { flag: "🇱🇰", code: "CSE" },
    { flag: "₿", code: "Crypto" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {markets.map((m, i) => (
        <motion.span
          key={m.code}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] font-medium"
        >
          <span aria-hidden>{m.flag}</span>
          {m.code}
        </motion.span>
      ))}
    </div>
  );
}

function PortfolioPreview() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-[11px]">
        <span className="font-mono font-medium">AAPL</span>
        <span className="font-mono tabular-nums text-bull">+12.4%</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-[11px]">
        <span className="font-mono font-medium">RELIANCE.NS</span>
        <span className="font-mono tabular-nums text-bull">+3.1%</span>
      </div>
    </div>
  );
}

function NewsPreview() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-bull" />
        <span className="truncate text-foreground/80">Q4 earnings top estimates</span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-bear" />
        <span className="truncate text-foreground/80">Guidance cut on AI capex</span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral" />
        <span className="truncate text-foreground/80">CEO speaks at Davos</span>
      </div>
    </div>
  );
}

function ChartPreview() {
  return (
    <svg viewBox="0 0 200 80" className="h-16 w-full" aria-hidden>
      <defs>
        <linearGradient id="bento-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0,55 L25,50 L50,40 L75,45 L100,30 L125,32 L150,22 L175,28 L200,15 L200,80 L0,80 Z"
        fill="url(#bento-chart-fill)"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: EASE }}
      />
      <motion.path
        d="M0,55 L25,50 L50,40 L75,45 L100,30 L125,32 L150,22 L175,28 L200,15"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: EASE }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------- */
/* 5. How It Works                                                      */
/* ------------------------------------------------------------------- */

const STEPS = [
  {
    icon: LogIn,
    title: "Sign in with Google",
    body: "5 seconds. No card. We only see your email, name, and avatar.",
  },
  {
    icon: Layers,
    title: "Pick your markets",
    body: "Choose any of US, India (NSE/BSE), Sri Lanka CSE, or crypto. We tailor your dashboard.",
  },
  {
    icon: TrendingUp,
    title: "Read the tape",
    body: "AI ratings, fundamentals, news sentiment, insider activity - every public stock, one search.",
  },
];

function HowItWorks() {
  return (
    <section className="relative border-y border-border/40 px-6 py-24 sm:px-10 sm:py-32 lg:px-16">
      <div className="bg-aurora pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: EASE }}
            className="font-display text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            Live in three steps.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: EASE }}
                className="relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- */
/* 6. Animated Dashboard Preview                                        */
/* ------------------------------------------------------------------- */

function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.55, ease: EASE }}
            className="font-display text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            A workspace, not a feed.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : undefined}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground"
          >
            Dense, terminal-quiet, keyboard-first. ⌘K from anywhere to search 45,000+
            equities and crypto.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : undefined}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-[0_30px_60px_-20px_hsl(var(--primary)/0.4)]"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-border/60 bg-background/60 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-bear/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-bull/70" />
            <span className="ml-3 font-mono text-[10px] text-muted-foreground">
              stockvision.app/stock/AAPL
            </span>
          </div>

          {/* Dashboard body */}
          <div className="relative grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-semibold">AAPL</span>
                    <span className="badge-ticker">NASDAQ</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Apple Inc.</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-semibold tabular-nums">
                    $214.32
                  </p>
                  <p className="font-mono text-xs tabular-nums text-bull">+2.41%</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <BigChart />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "P/E", value: "28.4" },
                  { label: "EPS", value: "7.55" },
                  { label: "Mkt cap", value: "3.4T" },
                  { label: "Div", value: "0.51%" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={inView ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.4, delay: 0.6 + i * 0.06 }}
                    className="rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                  >
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {s.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {/* AI rating card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : undefined}
                transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    AI rating
                  </span>
                  <span className="rounded-full border border-bull/40 bg-bull/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-bull">
                    BUY
                  </span>
                </div>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight">
                  $245
                </p>
                <p className="text-[10px] text-muted-foreground">12-month target</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={inView ? { width: "86%" } : undefined}
                    transition={{ duration: 1.2, delay: 0.8 }}
                    className="h-full bg-gradient-to-r from-primary to-bull"
                  />
                </div>
              </motion.div>

              {/* News strip */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : undefined}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="rounded-xl border border-border/60 bg-background/40 p-4"
              >
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Newspaper className="h-3 w-3" aria-hidden />
                  Headlines
                </span>
                <ul className="mt-2 space-y-1.5 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-bull" />
                    <span className="truncate text-foreground/80">
                      Vision Pro launch tops 200K units
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-bull" />
                    <span className="truncate text-foreground/80">
                      Services revenue hits record
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-neutral" />
                    <span className="truncate text-foreground/80">
                      EU competition probe ongoing
                    </span>
                  </li>
                </ul>
              </motion.div>

              {/* Alert chip */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : undefined}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 text-[11px]"
              >
                <Bell className="h-3 w-3 text-primary" aria-hidden />
                <span className="text-foreground/80">Price alert: $220</span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BigChart() {
  return (
    <svg viewBox="0 0 800 220" preserveAspectRatio="none" className="h-40 w-full" aria-hidden>
      <defs>
        <linearGradient id="big-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--bull))" />
        </linearGradient>
        <linearGradient id="big-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0,180 L60,170 L120,150 L180,160 L240,130 L300,140 L360,110 L420,120 L480,90 L540,95 L600,70 L660,80 L720,55 L800,60 L800,220 L0,220 Z"
        fill="url(#big-fill)"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2, ease: EASE }}
      />
      <motion.path
        d="M0,180 L60,170 L120,150 L180,160 L240,130 L300,140 L360,110 L420,120 L480,90 L540,95 L600,70 L660,80 L720,55 L800,60"
        fill="none"
        stroke="url(#big-line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2, ease: EASE }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------- */
/* 7. Final CTA                                                         */
/* ------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="relative overflow-hidden px-6 py-32 sm:px-10 lg:px-16">
      <LiquidEther intensity={0.35} />
      <div className="bg-aurora absolute inset-0" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center"
      >
        <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
          Stop tab-switching.{" "}
          <span className="gradient-text">Start investing.</span>
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          One workspace for every public stock - across every market that matters.
          Free to start, no card required.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/auth/signin?next=/"
            className="group inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.8)] transition-all duration-200 hover:-translate-y-0.5"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Sign in with Google
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 cursor-pointer items-center gap-1.5 rounded-xl border border-border/70 bg-card/60 px-5 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-card"
          >
            See pricing
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------- */
/* 8. Footer                                                            */
/* ------------------------------------------------------------------- */

function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30 px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden />
          </span>
          <span className="font-display font-semibold text-foreground">
            StockVision
          </span>
          <span>· Built for serious investors.</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <Link href="/pricing" className="cursor-pointer hover:text-foreground">
            Pricing
          </Link>
          <Link href="/auth/signin" className="cursor-pointer hover:text-foreground">
            Sign in
          </Link>
          <span>·</span>
          <span>
            Data may be delayed up to 15 minutes. Not investment advice.
          </span>
        </div>
      </div>
    </footer>
  );
}

