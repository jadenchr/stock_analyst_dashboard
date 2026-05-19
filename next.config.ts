import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // s3.tradingview.com hosts tv.js for the Advanced Chart widget;
      // www.tradingview-widget.com is the iframe host used by the widget
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://s3.tradingview.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: https://logo.clearbit.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://www.alphavantage.co https://financialmodelingprep.com https://finnhub.io https://newsapi.org https://api.anthropic.com https://api.fred.stlouisfed.org https://www.cse.lk https://openrouter.ai https://*.tradingview.com",
      // TradingView renders the chart inside an iframe pointing to www.tradingview-widget.com
      "frame-src 'self' https://*.tradingview.com https://www.tradingview-widget.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Silence the multi-lockfile warning by pinning trace root to this project.
  outputFileTracingRoot: __dirname,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "**.tradingview.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default withBundleAnalyzer(nextConfig);
