"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, getPage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Application, ApplicationStatus, PageMeta } from "@/types";
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

type StatusFilter = "all" | ApplicationStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    return getPage<Application>("/admin/applications", {
      status: filter === "all" ? undefined : filter,
      page,
    })
      .then((res) => {
        setError(null);
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load applications."))
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

  const columns: Column<Application>[] = [
    {
      header: "Student",
      cell: (a) => (
        <div>
          <p className="font-medium">{a.student?.user?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{a.student?.student_id ?? ""}</p>
        </div>
      ),
    },
    {
      header: "Internship",
      cell: (a) => a.internship?.title ?? "—",
    },
    {
      header: "Company",
      cell: (a) => a.internship?.company?.company_name ?? "—",
    },
    {
      header: "Applied",
      cell: (a) => formatDateTime(a.applied_at),
    },
    {
      header: "Status",
      cell: (a) => <StatusBadge status={a.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="text-sm text-muted-foreground">All student applications across internships.</p>
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
          title="Failed to load applications"
          description={error}
          action={{ label: "Retry", onClick: retry }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            rowKey={(a) => a.id}
            emptyTitle="No applications found"
            emptyDescription={filter !== "all" ? "Try another status filter." : undefined}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}
    </div>
  );
}
