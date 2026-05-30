"use client";

import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /**
   * Render content for a cell; if omitted, the value is read by `key`.
   * Second arg is the row index - useful for rank / row-number columns.
   */
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Hide this column in the mobile card view (e.g. redundant labels). */
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Unique row id selector - used as React key. */
  rowKey: (row: T, i: number) => string;
  /** Optional empty-state message. */
  empty?: string;
  className?: string;
  /**
   * Column key that should serve as the row title on the mobile card
   * (the first column is used if omitted).
   */
  mobileTitleKey?: string;
}

/**
 * Data table that gracefully degrades to a card stack below `md`. The
 * standard table sits inside an overflow-x-auto box on desktop; on
 * mobile, each row becomes a vertical card with header:value rows.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "No data",
  className,
  mobileTitleKey,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="glass flex items-center justify-center rounded-xl px-4 py-8 text-xs text-muted-foreground">
        {empty}
      </div>
    );
  }

  const titleKey = mobileTitleKey ?? columns[0]?.key;

  return (
    <div className={cn("glass overflow-hidden rounded-xl", className)}>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-card/40 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-4 py-2.5 font-semibold",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    !c.align && "text-left",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className="border-b border-border/30 transition-colors duration-150 last:border-b-0 hover:bg-muted/40"
              >
                {columns.map((c) => {
                  const content = c.render
                    ? c.render(row, i)
                    : (row as unknown as Record<string, React.ReactNode>)[c.key];
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-2.5 align-middle text-foreground",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        !c.align && "text-left",
                        c.className,
                      )}
                    >
                      {content as React.ReactNode}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card stack */}
      <ul className="flex flex-col divide-y divide-border/30 md:hidden">
        {rows.map((row, i) => {
          const titleCol = columns.find((c) => c.key === titleKey);
          const titleNode = titleCol
            ? titleCol.render
              ? titleCol.render(row, i)
              : (row as unknown as Record<string, React.ReactNode>)[titleCol.key]
            : null;
          return (
            <li key={rowKey(row, i)} className="flex flex-col gap-2 px-4 py-3">
              {titleNode != null && (
                <div className="font-mono text-sm font-semibold text-foreground">
                  {titleNode as React.ReactNode}
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {columns
                  .filter((c) => c.key !== titleKey && !c.hideOnMobile)
                  .map((c) => {
                    const content = c.render
                      ? c.render(row, i)
                      : (row as unknown as Record<string, React.ReactNode>)[c.key];
                    return (
                      <div
                        key={c.key}
                        className="flex flex-col gap-0.5 border-b border-border/20 pb-1 last:border-b-0"
                      >
                        <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {c.header}
                        </dt>
                        <dd className="font-mono text-xs tabular-nums text-foreground">
                          {content as React.ReactNode}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
