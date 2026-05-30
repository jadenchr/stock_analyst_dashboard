import type { Metadata } from "next";
import { SettingsThemeCard } from "@/components/settings/settings-theme-card";
import { SettingsAccountCard } from "@/components/settings/settings-account-card";
import { SettingsBillingCard } from "@/components/settings/settings-billing-card";
import { SettingsExchangesCard } from "@/components/settings/settings-exchanges-card";
import { SettingsNotificationsCard } from "@/components/settings/settings-notifications-card";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your StockVision account, plan, and appearance preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-2">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account, billing, preferences, and appearance.
        </p>
      </header>

      <SettingsAccountCard />
      <SettingsBillingCard />
      <SettingsExchangesCard />
      <SettingsNotificationsCard />
      <SettingsThemeCard />
    </div>
  );
}
