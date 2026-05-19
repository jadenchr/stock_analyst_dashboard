import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { JetBrains_Mono, Plus_Jakarta_Sans, Roboto } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SearchOverlay } from "@/components/search/search-overlay";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { getCurrentSession } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * Font system
 * -----------
 *   Display / Headers  → TT Hoves (paid) → Plus Jakarta Sans fallback
 *   Body / Tables      → Roboto
 *   Chart / Data       → JetBrains Mono
 *
 * TT Hoves is a commercial typeface from TypeType — not on Google Fonts.
 * Plus Jakarta Sans is the closest open-source match. To upgrade, drop
 * WOFF2s into `app/fonts/tt-hoves/` and swap `Plus_Jakarta_Sans` for
 * `localFont({ src: [...] })`.
 */
const fontDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: false,
});

const fontSans = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://stockvision-ai.vercel.app",
  ),
  title: {
    default: "StockVision — AI-Powered Equity Intelligence",
    // Per-page metadata.description is set on every route file; this
    // template only governs <title> formatting.
    template: "%s · StockVision",
  },
  description:
    "Analyst-grade dashboard for every public stock. Live quotes, Gemini 2.5 Pro AI ratings, financials, news sentiment, and insider activity across US, India (NSE / BSE), Sri Lanka (CSE), UK, and crypto.",
  applicationName: "StockVision",
  authors: [{ name: "Jaden Christy" }],
  creator: "Jaden Christy",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "StockVision — AI-Powered Equity Intelligence",
    description:
      "Live quotes, AI ratings, financials, news sentiment, and insider activity — for every public stock.",
    siteName: "StockVision",
  },
  twitter: {
    card: "summary_large_image",
    title: "StockVision — AI-Powered Equity Intelligence",
    description:
      "Live quotes, AI ratings, financials, and sentiment — for every public stock.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#FAFAFD" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Best-effort: surface the signed-in user to the client tree without a flash.
  // If Supabase isn't configured (local-dev fallback), getCurrentSession is a no-op.
  let initial: Awaited<ReturnType<typeof getCurrentSession>> = { user: null, profile: null };
  try {
    initial = await getCurrentSession();
  } catch (err) {
    console.error("[layout] getCurrentSession failed:", err);
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Pre-hydration theme bootstrap — sets the html class before paint */}
        <Script id="theme-init" src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body
        className={cn(
          fontDisplay.variable,
          fontSans.variable,
          fontMono.variable,
          "min-h-screen bg-background font-sans text-foreground",
        )}
      >
        <Providers initialUser={initial.user} initialProfile={initial.profile}>
          <ThemeProvider>
            <div className="relative flex min-h-screen">
              <Sidebar />

              <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
                <Header />
                <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
                  {children}
                </main>
              </div>

              <BottomNav />
              <SearchOverlay />
            </div>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
