/**
 * Tiny CSV parser tuned for portfolio imports. Handles:
 *   • RFC-4180 quoted fields with embedded commas and escaped quotes
 *   • Mixed CRLF / LF line endings
 *   • Header row + auto-detection of common broker column names
 *
 * Intentionally avoids `papaparse` to keep the bundle small — broker
 * CSVs are tiny (typically <100 rows) so a hand-rolled tokenizer is
 * plenty fast and easy to audit for security.
 */

import type { PortfolioImportPreviewRow } from "./types";
import { safeTicker } from "@/lib/utils/validators";

/* ------------------------------------------------------- tokenizer -------- */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++; // escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      // Swallow CR-LF as one boundary
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  // Flush final cell + row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/* ------------------------------------- header detection ------------------- */

type FieldKey = "symbol" | "shares" | "costBasis" | "purchaseDate" | "notes";

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  symbol: ["symbol", "ticker", "security", "instrument", "stock"],
  shares: ["shares", "quantity", "qty", "units", "share count"],
  costBasis: [
    "cost basis",
    "average cost",
    "avg cost",
    "price",
    "purchase price",
    "cost per share",
    "cost",
  ],
  purchaseDate: [
    "date",
    "trade date",
    "purchase date",
    "acquired",
    "acquired date",
    "buy date",
    "transaction date",
  ],
  notes: ["notes", "note", "memo", "comment"],
};

export function detectColumns(headerRow: string[]): Record<FieldKey, number> {
  const lowered = headerRow.map((h) => h.trim().toLowerCase());
  const out: Record<FieldKey, number> = {
    symbol: -1,
    shares: -1,
    costBasis: -1,
    purchaseDate: -1,
    notes: -1,
  };
  (Object.keys(HEADER_ALIASES) as FieldKey[]).forEach((key) => {
    for (const alias of HEADER_ALIASES[key]) {
      const idx = lowered.indexOf(alias);
      if (idx !== -1) {
        out[key] = idx;
        return;
      }
    }
  });
  return out;
}

/* ------------------------------------- normalize values ------------------- */

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  // US (M/D/YYYY) or D/M/YYYY — ambiguous; assume US since Robinhood et al
  // emit it that way.
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const month = m[1].padStart(2, "0");
    const day = m[2].padStart(2, "0");
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  const dt = new Date(trimmed);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

function parseNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s,$₹£€]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------ row mapper ------------------- */

export function mapRows(rows: string[][]): PortfolioImportPreviewRow[] {
  if (rows.length === 0) return [];
  const header = rows[0];
  const cols = detectColumns(header);
  const dataRows = rows.slice(1);

  return dataRows.map((cells, idx) => {
    const raw: Record<string, string> = {};
    header.forEach((h, i) => {
      raw[h.trim()] = (cells[i] ?? "").trim();
    });

    const errors: string[] = [];
    if (cols.symbol === -1) errors.push("No 'symbol' column detected");
    if (cols.shares === -1) errors.push("No 'shares' column detected");
    if (cols.costBasis === -1) errors.push("No 'cost basis' column detected");

    const symbolRaw = cols.symbol >= 0 ? (cells[cols.symbol] ?? "") : "";
    const symbol = safeTicker(symbolRaw);
    if (!symbol && symbolRaw) errors.push(`Invalid ticker "${symbolRaw}"`);

    const shares = cols.shares >= 0 ? parseNumber(cells[cols.shares] ?? "") : null;
    if (shares != null && shares <= 0) errors.push("Shares must be > 0");

    const costBasis = cols.costBasis >= 0 ? parseNumber(cells[cols.costBasis] ?? "") : null;
    if (costBasis != null && costBasis < 0) errors.push("Cost basis must be ≥ 0");

    const purchaseDate =
      cols.purchaseDate >= 0 ? parseDate(cells[cols.purchaseDate] ?? "") : null;
    if (purchaseDate == null && cols.purchaseDate >= 0 && (cells[cols.purchaseDate] ?? "").trim()) {
      errors.push("Couldn't parse date");
    }

    const notes = cols.notes >= 0 ? (cells[cols.notes] ?? "").trim() : "";

    const valid =
      symbol != null &&
      shares != null &&
      shares > 0 &&
      costBasis != null &&
      costBasis >= 0 &&
      errors.length === 0;

    return {
      rowIndex: idx + 1, // 1-based for display, excluding header
      raw,
      symbol,
      shares,
      costBasis,
      purchaseDate,
      notes: notes || null,
      valid,
      errors,
    };
  });
}
