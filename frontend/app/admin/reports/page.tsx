"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, getPage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PageMeta, Report, ReportStatus } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppPagination } from "@/components/shared/AppPagination";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";

type StatusFilter = "all" | ReportStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "revision_required", label: "Revision Required" },
];

export default function AdminReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    return getPage<Report>("/admin/reports", {
      status: filter === "all" ? undefined : filter,
      page,
    })
      .then((res) => {
        setError(null);
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load reports."))
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load();
  };

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const columns: Column<Report>[] = [
    {
      header: "Title",
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      header: "Student",
      cell: (r) => r.assignment?.student?.user?.name ?? "—",
    },
    {
      header: "Company",
      cell: (r) => r.assignment?.company?.company_name ?? "—",
    },
    {
      header: "Type",
      cell: (r) => <span className="capitalize">{r.report_type}</span>,
    },
    { header: "Submitted", cell: (r) => formatDate(r.submitted_at) },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Internship reports submitted by students.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filter}
          items={Object.fromEntries(FILTERS.map((f) => [f.value, f.label]))}
          onValueChange={(value) => {
            setFilter(value as StatusFilter);
            setLoading(true);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <EmptyState
          title="Failed to load reports"
          description={error}
          action={{ label: "Retry", onClick: retry }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            rowKey={(r) => r.id}
            emptyTitle="No reports found"
            emptyDescription={filter !== "all" ? "Try another status filter." : undefined}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}
    </div>
  );
}
