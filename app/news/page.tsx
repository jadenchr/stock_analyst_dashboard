import { NewsTrendingClient } from "@/components/news/news-trending-client";

export const metadata = {
  title: "News",
};

export default function NewsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Business news
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Top business headlines with sentiment classification · NewsAPI · refreshed every 5 minutes
        </p>
      </header>

      <NewsTrendingClient />
    </div>
  );
}
