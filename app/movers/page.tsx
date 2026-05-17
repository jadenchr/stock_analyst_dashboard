import { TopMovers } from "@/components/market/top-movers";

export const metadata = {
  title: "Movers",
};

export default function MoversPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl tracking-tight text-foreground">Movers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The largest absolute % moves across US equities right now.
        </p>
      </header>

      <TopMovers />
    </div>
  );
}
