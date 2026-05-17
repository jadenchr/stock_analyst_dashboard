import { Construction } from "lucide-react";

export const metadata = {
  title: "Screener",
};

export default function ScreenerPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl tracking-tight text-foreground">Screener</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Multi-factor filtering across the equity universe.
        </p>
      </header>

      <section className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
          <Construction className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <h2 className="font-display text-2xl tracking-tight text-foreground">Shipping in Phase 6</h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Custom screens with valuation, growth, profitability, and technical filters —
          backed by the same Zod-validated API surface that powers stock pages today.
        </p>
      </section>
    </div>
  );
}
