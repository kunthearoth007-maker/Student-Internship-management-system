"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RotateCcw } from "lucide-react";
import { AppPagination } from "@/components/shared/AppPagination";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReportFormDialog, type ReportFormValues } from "@/components/student/ReportFormDialog";
import { ReportViewDialog } from "@/components/student/ReportViewDialog";
import { ApiError, api, getPage, sendData } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ApiEnvelope, Assignment, PageMeta, Report } from "@/types";

export default function StudentReportsPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [viewing, setViewing] = useState<Report | null>(null);

  const load = useCallback(() => {
    return getPage<Report>("/student/reports", { page })
      .then((res) => {
        setRows(res.items ?? []);
        setMeta(res.meta);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get<ApiEnvelope<Assignment[]>>("/student/assignments")
      .then((res) => {
        if (!cancelled) setAssignments(res.data.data ?? []);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof ApiError ? err.message : "Failed to load assignments");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buildFormData = (values: ReportFormValues): FormData => {
    const form = new FormData();
    form.append("assignment_id", values.assignment_id);
    form.append("report_type", values.report_type);
    form.append("title", values.title);
    form.append("description", values.description);
    if (values.file) {
      form.append("file", values.file);
    }
    return form;
  };

  const submitReport = async (values: ReportFormValues) => {
    if (editing) {
      await sendData("put", `/student/reports/${editing.id}`, buildFormData(values));
      toast.success("Report resubmitted for review");
    } else {
      await sendData("post", "/student/reports", buildFormData(values));
      toast.success("Report submitted successfully");
    }
    await load();
  };

  const columns: Column<Report>[] = [
    {
      header: "Title",
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.assignment?.internship?.title ?? row.assignment?.company?.company_name ?? "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Type",
      cell: (row) => <Badge variant="secondary">{row.report_type}</Badge>,
    },
    {
      header: "Submitted",
      cell: (row) => <span className="text-sm">{formatDateTime(row.submitted_at)}</span>,
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Feedback",
      cell: (row) => <span className="text-sm">{row.feedbacks?.length ?? 0}</span>,
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setViewing(row)}>
            View
          </Button>
          {row.status === "revision_required" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
            >
              <RotateCcw /> Resubmit
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">My Reports</h1>
          <p className="text-sm text-muted-foreground">
            Submit weekly, monthly and final internship reports for your supervisor to review.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus /> Submit report
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            rowKey={(row) => row.id}
            emptyTitle="No reports yet"
            emptyDescription="Once you are assigned to an internship you can submit progress reports."
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </CardContent>
      </Card>

      <ReportFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Resubmit report" : "Submit report"}
        description={
          editing
            ? "Update the report according to your supervisor's feedback and send it again."
            : "Describe your progress and attach evidence if required."
        }
        assignments={assignments}
        report={editing}
        submitLabel={editing ? "Resubmit" : "Submit"}
        onSubmit={submitReport}
      />

      <ReportViewDialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)} report={viewing} />
    </div>
  );
}
