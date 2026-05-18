import { SettingsThemeCard } from "@/components/settings/settings-theme-card";
import { SettingsAccountCard } from "@/components/settings/settings-account-card";

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
          Account, appearance, and integration preferences.
        </p>
      </header>

      <SettingsAccountCard />
      <SettingsThemeCard />
    </div>
  );
}
