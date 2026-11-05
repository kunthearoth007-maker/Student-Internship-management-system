"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardCard, type DashboardCardTone } from "@/components/shared/DashboardCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AppPagination } from "@/components/shared/AppPagination";
import { ApiError, getData, getPage, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AttendanceRow, AttendanceSummary, Assignment, PageMeta, Role } from "@/types";
import { toast } from "sonner";

const ASSIGNMENTS_URL: Partial<Record<Role, string>> = {
  supervisor: "/supervisor/students",
  company: "/company/assignments",
  admin: "/admin/assignments",
};

const STATUSES = ["present", "late", "absent", "excused"] as const;

export function AttendanceView({ role }: { role: Role }) {
  const canRecord = role !== "student";
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [interns, setInterns] = useState<Assignment[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [page, setPage] = useState(1);
  const [assignmentFilter, setAssignmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    assignment_id: "",
    recorded_on: new Date().toISOString().slice(0, 10),
    status: "present" as (typeof STATUSES)[number],
    hours: "8",
    note: "",
  });

  const load = useCallback(() => {
    const params: Record<string, unknown> = { page, per_page: 20 };
    if (assignmentFilter) params.assignment_id = assignmentFilter;
    if (statusFilter) params.status = statusFilter;

    return Promise.all([
      getData<{ items: AttendanceRow[]; pagination?: PageMeta }>("/attendance", params),
      getData<AttendanceSummary[]>(
        "/attendance/summary",
        assignmentFilter ? { assignment_id: assignmentFilter } : undefined
      ),
    ])
      .then(([feed, summaryFeed]) => {
        setRows(feed.items);
        setMeta(feed.pagination);
        setSummaries(summaryFeed);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load attendance");
        setRows([]);
        setSummaries([]);
      })
      .finally(() => setLoading(false));
  }, [page, assignmentFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  useEffect(() => {
    const url = ASSIGNMENTS_URL[role];
    if (!url) return;
    getPage<Assignment>(url, { per_page: 100 })
      .then((res) => setInterns(res.items))
      .catch(() => setInterns([]));
  }, [role]);

  const totals = summaries.reduce(
    (acc, row) => ({
      days: acc.days + row.days,
      present: acc.present + row.present,
      late: acc.late + row.late,
      absent: acc.absent + row.absent,
      excused: acc.excused + row.excused,
      hours: acc.hours + row.hours,
    }),
    { days: 0, present: 0, late: 0, absent: 0, excused: 0, hours: 0 }
  );

  const rate =
    totals.days > 0 ? (((totals.present + totals.late) / totals.days) * 100).toFixed(1) + "%" : "—";

  const save = async () => {
    if (!form.assignment_id) {
      toast.error("Choose the intern to record");
      return;
    }
    setSaving(true);
    try {
      await sendData("post", "/attendance", {
        assignment_id: Number(form.assignment_id),
        recorded_on: form.recorded_on,
        status: form.status,
        hours: form.hours ? Number(form.hours) : null,
        note: form.note.trim() || null,
      });
      toast.success("Attendance saved — the student was notified");
      setDialogOpen(false);
      setForm((prev) => ({ ...prev, note: "" }));
      void load();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.fieldError("status") ?? error.fieldError("recorded_on") ?? error.message
          : "Could not save attendance"
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AttendanceRow>[] = [
    { header: "Date", cell: (r) => <span className="font-medium">{formatDate(r.recorded_on)}</span> },
  ];

  if (role !== "student") {
    columns.push({
      header: "Student",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{r.student ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">{r.internship ?? "—"}</p>
        </div>
      ),
    });
  } else {
    columns.push({
      header: "Internship",
      cell: (r) => <span className="text-sm text-slate-700">{r.internship ?? "—"}</span>,
    });
  }

  columns.push(
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { header: "Hours", cell: (r) => r.hours ?? "—" },
    {
      header: "Note",
      cell: (r) => <span className="text-sm text-muted-foreground">{r.note || "—"}</span>,
    },
    {
      header: "Recorded by",
      cell: (r) => <span className="text-sm text-slate-600">{r.recorded_by ?? "—"}</span>,
    }
  );

  const cards: { title: string; value: string | number; tone: DashboardCardTone }[] = [
    { title: "Days tracked", value: totals.days, tone: "blue" },
    { title: "Present", value: totals.present, tone: "green" },
    { title: "Late", value: totals.late, tone: "amber" },
    { title: "Absent", value: totals.absent, tone: "rose" },
    { title: "Hours", value: Math.round(totals.hours * 10) / 10, tone: "violet" },
    { title: "Attendance rate", value: rate, tone: "sky" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {canRecord
              ? "Mark interns day by day; they see the same numbers instantly."
              : "Every day your supervisor or company has recorded."}
          </p>
        </div>
        {canRecord && (
          <Button
            size="sm"
            className="gap-1.5 rounded-full bg-primary px-4 hover:bg-primary-hover"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" /> Record attendance
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <DashboardCard key={card.title} {...card} tone={card.tone} />
        ))}
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap gap-3">
            {canRecord && interns.length > 0 && (
              <select
                aria-label="Filter by intern"
                value={assignmentFilter}
                onChange={(e) => {
                  setLoading(true);
                  setPage(1);
                  setAssignmentFilter(e.target.value);
                }}
                className="h-9 rounded-lg border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">All interns</option>
                {interns.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.student?.user?.name ?? `Assignment #${assignment.id}`}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setLoading(true);
                setPage(1);
                setStatusFilter(e.target.value);
              }}
              className="h-9 rounded-lg border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            emptyTitle="No attendance recorded yet"
            emptyDescription={
              canRecord
                ? "Record the first day to start tracking progress."
                : "Your supervisor or company will record your days."
            }
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record attendance</DialogTitle>
            <DialogDescription>
              Saving the same intern on the same date updates that day instead of duplicating it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attendance-assignment">Intern</Label>
              <select
                id="attendance-assignment"
                value={form.assignment_id}
                onChange={(e) => setForm({ ...form, assignment_id: e.target.value })}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">Select an intern</option>
                {interns.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.student?.user?.name ?? `Assignment #${assignment.id}`} —{" "}
                    {assignment.internship?.title ?? "Internship"}
                  </option>
                ))}
              </select>
              {interns.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  You have no interns to record yet. Assign one first.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="attendance-date">Date</Label>
                <Input
                  id="attendance-date"
                  type="date"
                  value={form.recorded_on}
                  onChange={(e) => setForm({ ...form, recorded_on: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-status">Status</Label>
                <select
                  id="attendance-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as (typeof STATUSES)[number] })
                  }
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status[0].toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance-hours">Hours</Label>
              <Input
                id="attendance-hours"
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance-note">Note</Label>
              <Textarea
                id="attendance-note"
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Optional context for this day"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="gap-1.5 rounded-full bg-primary hover:bg-primary-hover"
              onClick={save}
              disabled={saving || !form.assignment_id}
            >
              <CalendarCheck className="size-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
