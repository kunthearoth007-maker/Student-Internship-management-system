"use client";

import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  rowKey,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
}) {
  if (loading) return <LoadingSpinner />;

  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
            {columns.map((column) => (
              <TableHead
                key={column.header}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={rowKey(row, index)}
              className={`border-b border-slate-100 last:border-0 transition-colors hover:bg-blue-50/40 ${
                onRowClick ? "cursor-pointer" : ""
              }`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column, ci) => (
                <TableCell key={ci}>{column.cell(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
