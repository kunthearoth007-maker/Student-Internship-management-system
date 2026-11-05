"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, MapPin, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AppPagination } from "@/components/shared/AppPagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError, getData, getPage, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { Assignment, Meeting, PageMeta, Role } from "@/types";
import { toast } from "sonner";

const ASSIGNMENTS_URL: Partial<Record<Role, string>> = {
  supervisor: "/supervisor/students",
  company: "/company/assignments",
  admin: "/admin/assignments",
};

interface FormState {
  id: number | null;
  assignment_id: string;
  title: string;
  agenda: string;
  scheduled_on: string;
  scheduled_at: string;
  duration_minutes: string;
  location: string;
  status: Meeting["status"];
  outcome: string;
}

const blankForm = (): FormState => ({
  id: null,
  assignment_id: "",
  title: "",
  agenda: "",
  scheduled_on: "",
  scheduled_at: "09:00",
  duration_minutes: "30",
  location: "",
  status: "scheduled",
  outcome: "",
});

export function MeetingsView({ role }: { role: Role }) {
  const { user } = useAuth();
  const canManage = role !== "student";
  const [rows, setRows] = useState<Meeting[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<"upcoming" | "all">("upcoming");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [interns, setInterns] = useState<Assignment[]>([]);

  const load = useCallback(() => {
    return getData<{ items: Meeting[]; pagination?: PageMeta }>("/meetings", {
      page,
      per_page: 15,
      scope,
    })
      .then((feed) => {
        setRows(feed.items);
        setMeta(feed.pagination);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load meetings");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [page, scope]);

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

  const openCreate = () => {
    setForm({ ...blankForm(), scheduled_on: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  };

  const openEdit = (meeting: Meeting) => {
    setForm({
      id: meeting.id,
      assignment_id: "",
      title: meeting.title,
      agenda: meeting.agenda ?? "",
      scheduled_on: meeting.scheduled_on,
      scheduled_at: meeting.scheduled_at?.slice(0, 5) ?? "09:00",
      duration_minutes: String(meeting.duration_minutes ?? 30),
      location: meeting.location ?? "",
      status: meeting.status,
      outcome: meeting.outcome ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.scheduled_on || !form.scheduled_at) {
      toast.error("Title, date and time are required");
      return;
    }
    if (!form.id && !form.assignment_id) {
      toast.error("Choose which intern this meeting is for");
      return;
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      agenda: form.agenda.trim() || null,
      scheduled_on: form.scheduled_on,
      scheduled_at: form.scheduled_at,
      duration_minutes: Number(form.duration_minutes) || 30,
      location: form.location.trim() || null,
    };

    setSaving(true);
    try {
      if (form.id) {
        await sendData("put", `/meetings/${form.id}`, {
          ...payload,
          status: form.status,
          outcome: form.outcome.trim() || null,
        });
        toast.success(form.status === "scheduled" ? "Meeting updated" : `Meeting ${form.status}`);
      } else {
        await sendData("post", "/meetings", { ...payload, assignment_id: Number(form.assignment_id) });
        toast.success("Meeting scheduled — the student and team were notified");
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.fieldError("title") ?? error.fieldError("scheduled_on") ?? error.message
          : "Could not save the meeting"
      );
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (meeting: Meeting, status: Meeting["status"]) => {
    setSaving(true);
    try {
      await sendData("put", `/meetings/${meeting.id}`, {
        title: meeting.title,
        scheduled_on: meeting.scheduled_on,
        scheduled_at: meeting.scheduled_at,
        status,
      });
      toast.success(`Meeting ${status}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the meeting");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await sendData("delete", `/meetings/${deleteTarget.id}`);
      toast.success("Meeting removed");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the meeting");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Meeting>[] = [
    {
      header: "Meeting",
      cell: (m) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{m.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {m.internship ?? m.company ?? "—"}
          </p>
        </div>
      ),
    },
    {
      header: "When",
      cell: (m) => (
        <div className="whitespace-nowrap">
          <p className="font-medium text-slate-800">{formatDate(m.scheduled_on)}</p>
          <p className="text-xs text-muted-foreground">
            {m.scheduled_at?.slice(0, 5)} · {m.duration_minutes} min
          </p>
        </div>
      ),
    },
    {
      header: "People",
      cell: (m) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{m.student ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">Host: {m.host ?? "—"}</p>
        </div>
      ),
    },
    {
      header: "Location",
      cell: (m) => (
        <span className="inline-flex items-center gap-1 text-sm text-slate-700">
          <MapPin className="size-3.5 text-muted-foreground" />
          {m.location || "TBC"}
        </span>
      ),
    },
    { header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
  ];

  if (canManage) {
    columns.push({
      header: "Actions",
      cell: (m) => (
        <div className="flex flex-wrap items-center gap-1">
          {m.status === "scheduled" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-full text-xs text-emerald-700 hover:bg-emerald-50"
                disabled={saving}
                onClick={() => setStatus(m, "completed")}
              >
                <CheckCircle2 className="size-3.5" /> Complete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-full text-xs text-amber-700 hover:bg-amber-50"
                disabled={saving}
                onClick={() => setStatus(m, "cancelled")}
              >
                <XCircle className="size-3.5" /> Cancel
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground hover:text-slate-900"
            aria-label="Edit meeting"
            onClick={() => openEdit(m)}
          >
            <Pencil className="size-4" />
          </Button>
          {m.is_host && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground hover:text-rose-600"
              aria-label="Delete meeting"
              onClick={() => setDeleteTarget(m)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    });
  }

  const selected = interns.find((a) => String(a.id) === form.assignment_id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Schedule check-ins with your interns; everyone involved gets notified."
              : "Check-ins scheduled by your supervisor and company."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-slate-200 bg-card p-0.5">
            {(["upcoming", "all"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setLoading(true);
                  setPage(1);
                  setScope(option);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  scope === option ? "bg-primary text-primary-foreground" : "text-slate-600"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {canManage && (
            <Button
              size="sm"
              className="gap-1.5 rounded-full bg-primary px-4 hover:bg-primary-hover"
              onClick={openCreate}
            >
              <Plus className="size-4" /> Schedule
            </Button>
          )}
        </div>
      </div>

      {user?.role === "student" && rows.length === 0 && !loading ? (
        <EmptyState
          title="No upcoming meetings"
          description="Your supervisor or company will schedule a check-in here."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          rowKey={(m) => m.id}
          emptyTitle={scope === "upcoming" ? "Nothing on the calendar" : "No meetings yet"}
          emptyDescription={
            canManage ? "Schedule one to notify the student and team." : undefined
          }
        />
      )}

      <AppPagination meta={meta} onChange={goToPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Update meeting" : "Schedule a meeting"}</DialogTitle>
            <DialogDescription>
              {form.id
                ? "Changes are pushed to every participant as a notification."
                : "The student, host and internship team are notified automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!form.id && (
              <div className="space-y-2">
                <Label htmlFor="assignment">Intern</Label>
                <select
                  id="assignment"
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
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Weekly check-in"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.scheduled_on}
                  onChange={(e) => setForm({ ...form, scheduled_on: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Room 204 / Google Meet"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda">Agenda</Label>
              <Textarea
                id="agenda"
                rows={3}
                value={form.agenda}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                placeholder="What will you cover?"
              />
            </div>

            {form.id && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value as Meeting["status"] })
                      }
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="space-y-2 pt-6">
                    <Badge
                      variant="outline"
                      className="gap-1.5 rounded-full border-slate-200 bg-slate-50 text-xs text-slate-600"
                    >
                      <CalendarClock className="size-3.5" />
                      {formatDate(form.scheduled_on)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outcome">Outcome</Label>
                  <Textarea
                    id="outcome"
                    rows={2}
                    value={form.outcome}
                    onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                    placeholder="Notes from the conversation"
                  />
                </div>
              </>
            )}

            {selected && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                {selected.student?.user?.name} · {selected.internship?.title ?? "—"}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-primary hover:bg-primary-hover"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : form.id ? "Save changes" : "Schedule meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this meeting?"
        description={deleteTarget ? `${deleteTarget.title} on ${formatDate(deleteTarget.scheduled_on)}` : undefined}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={remove}
      />
    </div>
  );
}
