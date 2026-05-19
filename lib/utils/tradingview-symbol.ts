/**
 * Map our internal ticker format to a TradingView symbol so the
 * Advanced Chart Widget can resolve it on any of the supported
 * exchanges.
 *
 * Our internal format vs TradingView format:
 *   AAPL          → NASDAQ:AAPL  (US — we default to NASDAQ; if Yahoo says
 *                                 NYSE, we prefix accordingly)
 *   RELIANCE.NS   → NSE:RELIANCE
 *   RELIANCE.BO   → BSE:RELIANCE
 *   BARC.L        → LSE:BARC
 *   JKH.N0000     → CSELK:JKH.N0000
 *   BTC-USD       → BINANCE:BTCUSDT
 *   ^GSPC         → SP:SPX  (we map a few well-known indices manually)
 */

const INDEX_MAP: Record<string, string> = {
  "^GSPC": "SP:SPX",
  "^IXIC": "NASDAQ:IXIC",
  "^DJI": "DJ:DJI",
  "^RUT": "TVC:RUT",
  "^FTSE": "TVC:UKX",
  "^NSEI": "NSE:NIFTY",
  "^BSESN": "BSE:SENSEX",
  "^N225": "TVC:NI225",
  "^HSI": "TVC:HSI",
};

const CRYPTO_MAP: Record<string, string> = {
  "BTC-USD": "BINANCE:BTCUSDT",
  "ETH-USD": "BINANCE:ETHUSDT",
  "BNB-USD": "BINANCE:BNBUSDT",
  "SOL-USD": "BINANCE:SOLUSDT",
  "DOGE-USD": "BINANCE:DOGEUSDT",
  "XRP-USD": "BINANCE:XRPUSDT",
};

/**
 * Resolve the TradingView symbol for a given ticker.
 *
 * `yahooExchange` is the optional exchange string from the Yahoo quote
 * (e.g. "NYSE", "NasdaqGS", "BSE", "NSE", "LSE", "Colombo Stock Exchange").
 * It lets us pick the correct US prefix (NYSE vs NASDAQ) when the
 * ticker itself doesn't tell us.
 */
export function toTradingViewSymbol(ticker: string, yahooExchange?: string): string {
  const t = ticker.toUpperCase();

  // 1) Hardcoded index map
  if (t in INDEX_MAP) return INDEX_MAP[t];

  // 2) Crypto pairs (BTC-USD style)
  if (t in CRYPTO_MAP) return CRYPTO_MAP[t];
  if (t.endsWith("-USD")) {
    const base = t.slice(0, -4);
    return `BINANCE:${base}USDT`;
  }

  // 3) Suffix-based exchange routing
  if (t.endsWith(".NS")) return `NSE:${t.slice(0, -3)}`;
  if (t.endsWith(".BO")) return `BSE:${t.slice(0, -3)}`;
  if (t.endsWith(".L")) return `LSE:${t.slice(0, -2)}`;
  if (t.endsWith(".TO")) return `TSX:${t.slice(0, -3)}`;
  if (t.endsWith(".AX")) return `ASX:${t.slice(0, -3)}`;
  if (t.endsWith(".HK")) return `HKEX:${t.slice(0, -3)}`;
  if (t.endsWith(".T")) return `TSE:${t.slice(0, -2)}`;
  if (t.endsWith(".DE")) return `XETR:${t.slice(0, -3)}`;
  if (t.endsWith(".PA")) return `EURONEXT:${t.slice(0, -3)}`;

  // 4) CSE — ticker.XNNNN format (e.g. JKH.N0000)
  if (/^[A-Z]{2,5}\.(N|X|P|R)\d{4}$/.test(t)) return `CSELK:${t}`;

  // 5) US — pick NYSE vs NASDAQ based on Yahoo's exchange string
  const ex = (yahooExchange ?? "").toUpperCase();
  if (ex.includes("NYSE")) return `NYSE:${t}`;
  if (ex.includes("NASDAQ")) return `NASDAQ:${t}`;
  // 6) Fallback — let TradingView guess
  return t;
}
