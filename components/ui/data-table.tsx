"use client";

import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /**
   * Render content for a cell; if omitted, the value is read by `key`.
   * Second arg is the row index — useful for rank / row-number columns.
   */
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

interface Props<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Unique row id selector — used as React key. */
  rowKey: (row: T, i: number) => string;
  /** Optional empty-state message. */
  empty?: string;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, empty = "No data", className }: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="glass flex items-center justify-center rounded-xl px-4 py-8 text-xs text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <div className={cn("glass overflow-hidden rounded-xl", className)}>
      <div className="overflow-x-auto">
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
    </div>
  );
}
