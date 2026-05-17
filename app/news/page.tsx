import Link from "next/link";
import { Newspaper, Search } from "lucide-react";

export const metadata = {
  title: "News",
};

export default function NewsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl tracking-tight text-foreground">News</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-ticker headlines with sentiment scoring live on each stock page.
        </p>
      </header>

      <section className="glass flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
          <Newspaper className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <h2 className="font-display text-2xl tracking-tight text-foreground">Search a ticker</h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          News and sentiment are scoped to a ticker today. A global news feed with
          sector + macro filters ships in Phase 6.
        </p>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          Open search
        </Link>
      </section>
    </div>
  );
}
