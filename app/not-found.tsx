import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 pt-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
        <SearchX className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="font-display text-2xl tracking-tight">Ticker not found</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        We couldn&rsquo;t find that symbol. Check the spelling, or search for a different ticker.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
      >
        Back to markets
      </Link>
    </div>
  );
}
