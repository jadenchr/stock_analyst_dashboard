import { ScreenerClient } from "@/components/screener/screener-client";

export const metadata = {
  title: "Screener",
};

export default function ScreenerPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Screener
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Five preset screens powered by Yahoo Finance · refreshed every 60 seconds
        </p>
      </header>

      <ScreenerClient />
    </div>
  );
}
