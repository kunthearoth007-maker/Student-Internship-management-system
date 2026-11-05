"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { ApiError, getData, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EvaluateForm,
  type EvaluationValues,
} from "@/components/company/EvaluateForm";
import type { Assignment, AssignmentStatus } from "@/types";

interface DashboardInterns {
  interns: Assignment[];
}

const EVALUATABLE_STATUSES: Assignment["status"][] = ["pending", "active", "completed"];

const STATUS_CHOICES: { value: AssignmentStatus; label: string }[] = [
  { value: "pending", label: "Pending start" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function CompanyInternsPage() {
  const [interns, setInterns] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [evalTarget, setEvalTarget] = useState<Assignment | null>(null);
  const [statusTarget, setStatusTarget] = useState<Assignment | null>(null);
  const [statusValue, setStatusValue] = useState<AssignmentStatus>("active");
  const [updating, setUpdating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return getData<DashboardInterns>("/company/dashboard")
      .then((data) => {
        setInterns(data.interns ?? []);
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Failed to load interns");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    load();
  };

  const submitEvaluation = async (values: EvaluationValues) => {
    if (!evalTarget) return;
    setSaving(true);
    try {
      await sendData("post", "/company/evaluations", {
        assignment_id: evalTarget.id,
        ...values,
      });
      toast.success("Evaluation submitted");
      setEvalTarget(null);
      refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to submit evaluation";
      toast.error(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async () => {
    if (!statusTarget) return;
    setUpdating(true);
    try {
      await sendData("put", `/company/assignments/${statusTarget.id}/status`, {
        status: statusValue,
      });
      toast.success(`Marked ${statusTarget.student?.user?.name ?? "this intern"} as ${statusValue}`);
      setStatusTarget(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the status");
    } finally {
      setUpdating(false);
    }
  };

  const columns: Column<Assignment>[] = [
    {
      header: "Student",
      cell: (row) => (
        <div className="min-w-32">
          <p className="font-medium">{row.student?.user?.name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground">
            {row.student?.major ?? ""}
            {row.student?.year ? ` · Year ${row.student.year}` : ""}
          </p>
        </div>
      ),
    },
    {
      header: "Internship",
      cell: (row) => row.internship?.title ?? "—",
    },
    {
      header: "Supervisor",
      cell: (row) =>
        row.supervisor?.name ??
        row.supervisor?.user?.name ??
        (row.supervisor_id ? "Assigned" : "Not assigned"),
    },
    {
      header: "Period",
      cell: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.start_date)} → {formatDate(row.end_date)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setStatusValue(row.status);
              setStatusTarget(row);
            }}
          >
            Set status
          </Button>
          {EVALUATABLE_STATUSES.includes(row.status) && (
            <Button size="xs" variant="outline" onClick={() => setEvalTarget(row)}>
              Evaluate
            </Button>
          )}
          <Link
            href="/company/messages"
            className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[0.8rem] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <MessageSquare className="size-3.5" /> Message
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Interns</h1>
        <p className="text-sm text-muted-foreground">
          Students currently or previously interning at your company.
        </p>
      </div>

      {loading && interns.length === 0 ? (
        <LoadingSpinner label="Loading interns..." />
      ) : (
        <DataTable
          columns={columns}
          rows={interns}
          loading={loading}
          rowKey={(row) => row.id}
          emptyTitle="No interns yet"
          emptyDescription="Accept an application to add an intern to your team."
        />
      )}

      <Dialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update intern status</DialogTitle>
            <DialogDescription>
              {statusTarget?.student?.user?.name ?? "The student"}
              {" — "}
              {statusTarget?.internship?.title ?? "internship"}. The student and supervisor are
              notified of the change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="intern-status">Status</Label>
            <select
              id="intern-status"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value as AssignmentStatus)}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {STATUS_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={updating} onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-primary hover:bg-primary-hover"
              disabled={updating}
              onClick={updateStatus}
            >
              {updating ? "Saving..." : "Save status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!evalTarget} onOpenChange={(open) => !open && setEvalTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Evaluate Intern</DialogTitle>
            <DialogDescription>
              {evalTarget?.student?.user?.name ?? "Student"} —{" "}
              {evalTarget?.internship?.title ?? "Internship"}
            </DialogDescription>
          </DialogHeader>
          {evalTarget && (
            <EvaluateForm
              key={evalTarget.id}
              loading={saving}
              submitLabel="Submit Evaluation"
              onSubmit={submitEvaluation}
              onCancel={() => setEvalTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
