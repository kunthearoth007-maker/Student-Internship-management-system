"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, getPage, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { AppPagination } from "@/components/shared/AppPagination";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EvaluateForm,
  type EvaluationValues,
} from "@/components/company/EvaluateForm";
import type { Evaluation, PageMeta } from "@/types";

type EvaluationRow = Evaluation & { created_at?: string };

export default function CompanyEvaluationsPage() {
  const [items, setItems] = useState<EvaluationRow[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<EvaluationRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback((targetPage: number) => {
    return getPage<EvaluationRow>("/evaluations", { page: targetPage })
      .then((res) => {
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Failed to load evaluations");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const refresh = () => {
    setLoading(true);
    load(page);
  };

  const goToPage = (targetPage: number) => {
    setLoading(true);
    setPage(targetPage);
  };

  const submitUpdate = async (values: EvaluationValues) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await sendData("put", `/company/evaluations/${editTarget.id}`, values);
      toast.success("Evaluation updated");
      setEditTarget(null);
      refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to update evaluation";
      toast.error(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<EvaluationRow>[] = [
    {
      header: "Student",
      cell: (row) => row.assignment?.student?.user?.name ?? `Assignment #${row.assignment_id}`,
    },
    {
      header: "Internship",
      cell: (row) => row.assignment?.internship?.title ?? "—",
    },
    {
      header: "Evaluator",
      cell: (row) => (
        <Badge variant={row.evaluator_type === "company" ? "default" : "secondary"}>
          {row.evaluator_type === "company" ? "Company" : "Supervisor"}
        </Badge>
      ),
    },
    {
      header: "Overall Score",
      cell: (row) => (
        <span className="text-base font-semibold whitespace-nowrap">
          {row.overall_score} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
        </span>
      ),
    },
    {
      header: "Date",
      cell: (row) => formatDate(row.created_at),
    },
    {
      header: "Actions",
      cell: (row) =>
        row.evaluator_type === "company" ? (
          <Button size="xs" variant="outline" onClick={() => setEditTarget(row)}>
            Edit
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evaluations</h1>
        <p className="text-sm text-muted-foreground">
          Performance evaluations you have submitted for your interns.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        rowKey={(row) => row.id}
        emptyTitle="No evaluations yet"
        emptyDescription="Evaluate your interns from the My Interns page to see results here."
      />
      <AppPagination meta={meta} onChange={goToPage} />

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Evaluation</DialogTitle>
            <DialogDescription>
              {editTarget?.assignment?.student?.user?.name ?? "Intern"} —{" "}
              {editTarget?.assignment?.internship?.title ?? "Internship"}
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <EvaluateForm
              key={editTarget.id}
              initialValues={{
                technical_score: editTarget.technical_score,
                communication_score: editTarget.communication_score,
                teamwork_score: editTarget.teamwork_score,
                attendance_score: editTarget.attendance_score,
                professionalism_score: editTarget.professionalism_score,
                comment: editTarget.comment,
              }}
              loading={saving}
              submitLabel="Save Changes"
              onSubmit={submitUpdate}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
