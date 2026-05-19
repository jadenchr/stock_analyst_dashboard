import type {
  ExchangeKey,
  InvestmentStyle,
  NotificationFrequency,
  RiskTolerance,
} from "@/lib/supabase/types";

/**
 * Static option lists for the profile form. Centralized so the AI picks
 * endpoint and the form UI both reference the same labels / values.
 */

export const COUNTRY_OPTIONS: { code: string; label: string; suggestedCurrency: string; flag: string }[] = [
  { code: "US", label: "United States", suggestedCurrency: "USD", flag: "🇺🇸" },
  { code: "IN", label: "India", suggestedCurrency: "INR", flag: "🇮🇳" },
  { code: "LK", label: "Sri Lanka", suggestedCurrency: "LKR", flag: "🇱🇰" },
  { code: "GB", label: "United Kingdom", suggestedCurrency: "GBP", flag: "🇬🇧" },
  { code: "CA", label: "Canada", suggestedCurrency: "CAD", flag: "🇨🇦" },
  { code: "AU", label: "Australia", suggestedCurrency: "AUD", flag: "🇦🇺" },
  { code: "DE", label: "Germany", suggestedCurrency: "EUR", flag: "🇩🇪" },
  { code: "FR", label: "France", suggestedCurrency: "EUR", flag: "🇫🇷" },
  { code: "SG", label: "Singapore", suggestedCurrency: "USD", flag: "🇸🇬" },
  { code: "JP", label: "Japan", suggestedCurrency: "USD", flag: "🇯🇵" },
  { code: "OTHER", label: "Somewhere else", suggestedCurrency: "USD", flag: "🌎" },
];

export const EXCHANGE_OPTIONS: { id: ExchangeKey; label: string; flag: string; tagline: string }[] = [
  { id: "US", label: "US (NYSE / NASDAQ)", flag: "🇺🇸", tagline: "AAPL, MSFT, NVDA" },
  { id: "IN_NSE", label: "India NSE", flag: "🇮🇳", tagline: "RELIANCE.NS, TCS.NS" },
  { id: "IN_BSE", label: "India BSE", flag: "🇮🇳", tagline: "RELIANCE.BO" },
  { id: "LK_CSE", label: "Sri Lanka CSE", flag: "🇱🇰", tagline: "JKH.N0000" },
  { id: "UK", label: "UK LSE", flag: "🇬🇧", tagline: "BARC.L" },
  { id: "CRYPTO", label: "Crypto", flag: "₿", tagline: "BTC-USD, ETH-USD" },
];

export const INVESTMENT_STYLE_OPTIONS: {
  id: InvestmentStyle;
  label: string;
  description: string;
}[] = [
  {
    id: "growth",
    label: "Growth",
    description: "Compounding revenue, expanding markets, profitable scaling",
  },
  {
    id: "value",
    label: "Value",
    description: "Undervalued vs intrinsic worth, margin of safety",
  },
  {
    id: "income",
    label: "Income",
    description: "Dividend stability, yield, defensive cash flows",
  },
  {
    id: "speculation",
    label: "Speculation",
    description: "High volatility, momentum, asymmetric upside",
  },
];

export const RISK_OPTIONS: { id: RiskTolerance; label: string; description: string }[] = [
  {
    id: "conservative",
    label: "Conservative",
    description: "Capital preservation first. Low volatility.",
  },
  {
    id: "moderate",
    label: "Moderate",
    description: "Balanced. Some drawdown for upside.",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    description: "Comfortable with volatility for higher returns.",
  },
];

export const CURRENCY_OPTIONS: { code: string; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "LKR", label: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
];

export const NOTIFICATION_OPTIONS: {
  id: NotificationFrequency;
  label: string;
  description: string;
}[] = [
  { id: "daily", label: "Daily", description: "Morning brief every weekday" },
  { id: "weekly", label: "Weekly", description: "Monday morning recap" },
  { id: "monthly", label: "Monthly", description: "First Sunday of the month" },
  { id: "never", label: "Never", description: "Quiet inbox, no emails" },
];
