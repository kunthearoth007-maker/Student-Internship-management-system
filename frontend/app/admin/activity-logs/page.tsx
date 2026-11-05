"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AppPagination } from "@/components/shared/AppPagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError, getData, downloadFile } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ActivityLogEntry, PageMeta } from "@/types";

const ROLES = [
  { value: "", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "student", label: "Student" },
  { value: "company", label: "Company" },
  { value: "supervisor", label: "Supervisor" },
];

const EXPORTS = [
  { url: "/admin/exports/students", label: "Students", file: "students.csv" },
  { url: "/admin/exports/applications", label: "Applications", file: "applications.csv" },
  { url: "/admin/exports/assignments", label: "Assignments", file: "assignments.csv" },
  { url: "/admin/exports/reports", label: "Reports", file: "reports.csv" },
];

export default function AdminActivityLogsPage() {
  const [items, setItems] = useState<ActivityLogEntry[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [action, setAction] = useState("");
  const [term, setTerm] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  const load = useCallback(() => {
    return getData<{ items: ActivityLogEntry[]; pagination?: PageMeta }>("/admin/activity-logs", {
      page,
      per_page: 25,
      role: role || undefined,
      action: action || undefined,
    })
      .then((feed) => {
        setError(null);
        setItems(feed.items);
        setMeta(feed.pagination);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load the activity log.");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [page, role, action]);

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

  const exportCsv = async (entry: (typeof EXPORTS)[number]) => {
    setExporting(entry.url);
    try {
      await downloadFile(entry.url, entry.file);
      toast.success(`${entry.label} exported`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Could not export ${entry.label}`);
    } finally {
      setExporting(null);
    }
  };

  const visible = term
    ? items.filter((log) =>
        `${log.description} ${log.action} ${log.user?.name ?? ""}`.toLowerCase().includes(term.toLowerCase())
      )
    : items;

  const columns: Column<ActivityLogEntry>[] = [
    {
      header: "When",
      cell: (log) => (
        <span className="whitespace-nowrap text-sm text-slate-600">
          {formatDateTime(log.created_at)}
        </span>
      ),
    },
    {
      header: "Who",
      cell: (log) => (
        <div className="min-w-32">
          <p className="truncate text-sm font-medium text-slate-900">{log.user?.name ?? "System"}</p>
          <p className="truncate text-xs text-muted-foreground">{log.user?.email ?? "—"}</p>
        </div>
      ),
    },
    {
      header: "Role",
      cell: (log) =>
        log.role ? (
          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-slate-50 text-[10px] capitalize text-slate-600"
          >
            {log.role}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      header: "Action",
      cell: (log) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{log.action}</code>
      ),
    },
    {
      header: "Detail",
      cell: (log) => (
        <div className="min-w-40 max-w-md">
          <p className="text-sm text-slate-800">{log.description}</p>
          {log.subject && <p className="text-xs text-muted-foreground">{log.subject}</p>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity log</h1>
        <p className="text-sm text-muted-foreground">
          Every cross-role action recorded by the platform, newest first.
        </p>
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setLoading(true);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setLoading(true);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">All actions</option>
              {[
                "application",
                "assignment",
                "attendance",
                "company",
                "department",
                "evaluation",
                "export",
                "internship",
                "meeting",
                "message",
                "period",
                "report",
                "user",
              ].map((prefix) => (
                <option key={prefix} value={prefix}>
                  {prefix}.*
                </option>
              ))}
            </select>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Filter this page..."
              className="h-9 min-w-40 flex-1 rounded-lg border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ScrollText className="size-3.5" /> Exports
            </span>
            {EXPORTS.map((entry) => (
              <Button
                key={entry.url}
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-full"
                disabled={exporting !== null}
                onClick={() => exportCsv(entry)}
              >
                <Download className="size-3.5" />
                {exporting === entry.url ? "Preparing..." : entry.label}
              </Button>
            ))}
          </div>

          {error ? (
            <EmptyState
              title="Failed to load the activity log"
              description={error}
              action={{ label: "Retry", onClick: retry }}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={visible}
                loading={loading}
                rowKey={(log) => log.id}
                emptyTitle="No activity recorded"
                emptyDescription="Actions taken by any role show up here."
              />
              <AppPagination meta={meta} onChange={goToPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
