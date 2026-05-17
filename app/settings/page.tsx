import { Settings } from "lucide-react";
import { SettingsThemeCard } from "@/components/settings/settings-theme-card";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Display preferences, currency, and API key management.
        </p>
      </header>

      <SettingsThemeCard />

      <section className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
          <Settings className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Currency &amp; API keys ship next
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Default currency (USD · INR · LKR · GBP · EUR), default chart type, and
          bring-your-own API keys (stored encrypted client-side, never sent to server logs)
          are queued for the next release.
        </p>
      </section>
    </div>
  );
}
