"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  LineChart,
  Newspaper,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SignInButton } from "@/components/auth/sign-in-button";
import { LiquidEther } from "@/components/effects/liquid-ether";

const SLIDES = [
  {
    id: "welcome",
    icon: Sparkles,
    tone: "primary" as const,
    eyebrow: "Welcome to StockVision",
    title: "Analyst-grade intelligence for every public stock",
    body: "Live quotes, fundamentals, AI ratings, news sentiment, and insider activity — in one terminal-fast workspace. US · India · Sri Lanka · UK · Crypto.",
  },
  {
    id: "features",
    icon: Brain,
    tone: "bull" as const,
    eyebrow: "Built for serious investors",
    title: "AI Analyst · Live Charts · Sentiment-tagged News",
    body: "Gemini 2.5 Pro evaluates each stock against 30+ fundamental, technical, and analyst signals. TradingView candlesticks with 6 indicators. NewsAPI + Finnhub feeds tagged by our lexical classifier.",
    bullets: [
      { icon: LineChart, label: "TradingView charts" },
      { icon: TrendingUp, label: "Real-time fundamentals" },
      { icon: Newspaper, label: "Sentiment-tagged news" },
    ],
  },
  {
    id: "signup",
    icon: TrendingUp,
    tone: "primary" as const,
    eyebrow: "One last step",
    title: "Sign in to unlock the full dashboard",
    body: "Guest access shows quotes and charts. Sign in with Google to get AI ratings, financials, news, insider activity, and cross-device watchlist sync. Free, no credit card.",
  },
] as const;

const TONE_MAP = {
  primary: {
    iconBg: "bg-primary/15",
    iconRing: "ring-primary/30",
    iconColor: "text-primary",
    accent: "from-primary/20 via-primary/5 to-transparent",
  },
  bull: {
    iconBg: "bg-bull/15",
    iconRing: "ring-bull/30",
    iconColor: "text-bull",
    accent: "from-bull/20 via-bull/5 to-transparent",
  },
};

interface Props {
  nextPath: string;
}

export function OnboardingFlow({ nextPath }: Props) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const slide = SLIDES[idx];
  const tone = TONE_MAP[slide.tone];
  const isLast = idx === SLIDES.length - 1;
  const Icon = slide.icon;

  // Persist a marker so we don't re-show this to returning visitors
  useEffect(() => {
    try {
      localStorage.setItem("stockvision.onboarded.v1", "true");
    } catch {
      /* SSR / private mode */
    }
  }, []);

  function go(next: number) {
    if (next < 0 || next >= SLIDES.length) return;
    setDirection(next > idx ? 1 : -1);
    setIdx(next);
  }

  function handleSwipe(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const threshold = 60;
    if (info.offset.x < -threshold && idx < SLIDES.length - 1) go(idx + 1);
    else if (info.offset.x > threshold && idx > 0) go(idx - 1);
  }

  function continueAsGuest() {
    router.push(nextPath);
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Ambient background — LiquidEther + aurora wash */}
      <LiquidEther intensity={0.22} position="fixed" />
      <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b",
          tone.accent,
        )}
        aria-hidden
      />

      {/* Top bar */}
      <header className="relative flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8">
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="StockVision home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            StockVision
          </span>
        </Link>
        <button
          type="button"
          onClick={continueAsGuest}
          className="cursor-pointer rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
        </button>
      </header>

      {/* Slide canvas */}
      <main className="relative flex flex-1 items-center justify-center px-5 py-10 sm:py-16">
        <div className="relative w-full max-w-2xl">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={slide.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={handleSwipe}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-2xl ring-1 sm:h-24 sm:w-24",
                  tone.iconBg,
                  tone.iconRing,
                )}
              >
                <Icon className={cn("h-9 w-9 sm:h-11 sm:w-11", tone.iconColor)} aria-hidden />
              </motion.div>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {slide.eyebrow}
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {slide.body}
              </p>

              {slide.id === "features" && (
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                  {SLIDES[1].bullets!.map((b) => {
                    const BIcon = b.icon;
                    return (
                      <span key={b.label} className="hint-chip">
                        <BIcon className="h-3 w-3 text-primary" aria-hidden />
                        {b.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {slide.id === "signup" && (
                <div className="mt-7 w-full max-w-sm space-y-3">
                  <SignInButton next={nextPath} />
                  <button
                    type="button"
                    onClick={continueAsGuest}
                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-border/70 bg-card/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-card"
                  >
                    Continue as guest
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer controls */}
      <footer className="relative px-5 pb-10 pt-2 sm:px-8 sm:pb-12">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <button
            type="button"
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/60 text-muted-foreground transition-colors duration-200",
              idx === 0
                ? "cursor-not-allowed opacity-40"
                : "cursor-pointer hover:border-border hover:bg-card hover:text-foreground",
            )}
            aria-label="Previous"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2" role="tablist" aria-label="Onboarding progress">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === idx}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => go(i)}
                className={cn(
                  "h-2 cursor-pointer rounded-full transition-all duration-300",
                  i === idx ? "w-8 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={continueAsGuest}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
              aria-label="Finish"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go(idx + 1)}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
              aria-label="Next"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
