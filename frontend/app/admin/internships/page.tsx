"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, getData, getPage, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Internship, InternshipPeriod, PageMeta } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppPagination } from "@/components/shared/AppPagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type ApprovalAction = "approve" | "reject" | "publish" | "unpublish";

const STATUS_FILTER_ITEMS: Record<string, string> = {
  all: "All statuses",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AdminInternshipsPage() {
  const [items, setItems] = useState<Internship[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [periods, setPeriods] = useState<InternshipPeriod[]>([]);
  const [page, setPage] = useState(1);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Internship | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    return getPage<Internship>("/admin/internships", {
      approval_status: filter === "all" ? undefined : filter,
      period_id: periodFilter === "all" ? undefined : periodFilter,
      page,
    })
      .then((res) => {
        setError(null);
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load internships."))
      .finally(() => setLoading(false));
  }, [filter, periodFilter, page]);

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

  useEffect(() => {
    getData<InternshipPeriod[]>("/periods")
      .then((rows) => setPeriods(rows ?? []))
      .catch(() => setPeriods([]));
  }, []);

  const SUCCESS_MESSAGES: Record<ApprovalAction, string> = {
    approve: "Internship approved.",
    reject: "Internship rejected.",
    publish: "Internship published.",
    unpublish: "Internship unpublished.",
  };

  const act = async (internship: Internship, action: ApprovalAction) => {
    setWorkingId(internship.id);
    try {
      await sendData("put", `/admin/internships/${internship.id}/${action}`);
      toast.success(SUCCESS_MESSAGES[action]);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to ${action} internship.`);
    } finally {
      setWorkingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sendData("delete", `/admin/internships/${deleteTarget.id}`);
      toast.success("Internship deleted.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete internship.");
    } finally {
      setDeleting(false);
    }
  };

  const periodFilterItems = {
    all: "All periods",
    ...Object.fromEntries(periods.map((period) => [String(period.id), period.name])),
  };

  const columns: Column<Internship>[] = [
    {
      header: "Title",
      cell: (i) => <span className="font-medium">{i.title}</span>,
    },
    { header: "Company", cell: (i) => i.company?.company_name ?? "—" },
    { header: "Category", cell: (i) => i.category },
    { header: "Location", cell: (i) => i.location || "—" },
    { header: "Positions", cell: (i) => i.positions },
    { header: "Deadline", cell: (i) => formatDate(i.application_deadline) },
    { header: "Period", cell: (i) => i.period ?? "Not scheduled" },
    {
      header: "Status",
      cell: (i) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={i.approval_status} />
          {i.is_published && (
            <Badge variant="secondary" className="bg-sky-100 text-sky-800 hover:bg-sky-100">
              Published
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (i) => {
        const busy = workingId === i.id;
        return (
          <div className="flex flex-wrap gap-1.5">
            {i.approval_status === "pending" && (
              <>
                <Button size="sm" disabled={busy} onClick={() => act(i, "approve")}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => act(i, "reject")}>
                  Reject
                </Button>
              </>
            )}
            {i.approval_status === "approved" && (
              <Button
                size="sm"
                variant={i.is_published ? "outline" : "default"}
                disabled={busy}
                onClick={() => act(i, i.is_published ? "unpublish" : "publish")}
              >
                {i.is_published ? "Unpublish" : "Publish"}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(i)}>
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Internships</h1>
        <p className="text-sm text-muted-foreground">
          Review, approve and publish company internship postings.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filter}
          items={STATUS_FILTER_ITEMS}
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
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={periodFilter}
          items={periodFilterItems}
          onValueChange={(value) => {
            setPeriodFilter(value ?? "all");
            setLoading(true);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by academic period">
            <SelectValue placeholder="All periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All periods</SelectItem>
            {periods.map((period) => (
              <SelectItem key={period.id} value={String(period.id)}>
                {period.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <EmptyState
          title="Failed to load internships"
          description={error}
          action={{ label: "Retry", onClick: retry }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            rowKey={(i) => i.id}
            emptyTitle="No internships found"
            emptyDescription={
              filter !== "all" || periodFilter !== "all" ? "Try another status or period filter." : undefined
            }
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete internship"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
