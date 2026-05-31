import type { Metadata } from "next";
import { PortfolioGate } from "@/components/portfolio/portfolio-gate";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Track your real positions with cost basis, live P&L, and per-currency aggregates. Import broker CSV in one click.",
  openGraph: {
    title: "Portfolio Tracker · StockVision",
    description: "Cost-basis P&L, multi-currency totals, CSV import.",
  },
};

export default function PortfolioPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Portfolio
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live P&L on every lot. Multi-currency aggregates. Drag-drop CSV import.
        </p>
      </header>

      <PortfolioGate />
    </div>
  );
}
