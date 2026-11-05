"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { ApiError, getPage, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type {
  Assignment,
  AssignmentStatus,
  Internship,
  PageMeta,
  Student,
  Supervisor,
} from "@/types";
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
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";

type StatusFilter = "all" | AssignmentStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["pending", "active", "completed", "cancelled"];

// base-ui renders the raw value until it can map it to a label, so every Select needs `items`.
const labelMap = (rows: { value: string; label: string }[]) =>
  Object.fromEntries(rows.map((row) => [row.value, row.label]));

const STATUS_ITEMS = labelMap(FILTERS);
const STATUS_EDIT_ITEMS = labelMap(
  ASSIGNMENT_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
);

const supervisorName = (s?: Supervisor | null) => s?.name ?? s?.user?.name ?? "—";

const supervisorLabel = (s: Supervisor) =>
  [
    supervisorName(s),
    s.department,
    typeof s.assignments_count === "number" ? `${s.assignments_count} students` : null,
  ]
    .filter(Boolean)
    .join(" — ");

function StatusSelect({
  value,
  onChange,
}: {
  value: AssignmentStatus;
  onChange: (value: AssignmentStatus) => void;
}) {
  return (
    <Select
      value={value}
      items={STATUS_EDIT_ITEMS}
      onValueChange={(v) => onChange(v as AssignmentStatus)}
    >
      <SelectTrigger className="w-full capitalize">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {ASSIGNMENT_STATUSES.map((status) => (
          <SelectItem key={status} value={status} className="capitalize">
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AdminAssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  // Picker data
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [pickersLoading, setPickersLoading] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [editSupervisor, setEditSupervisor] = useState<string>("none");
  const [editStatus, setEditStatus] = useState<AssignmentStatus>("pending");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createStudent, setCreateStudent] = useState("");
  const [createInternship, setCreateInternship] = useState("");
  const [createSupervisor, setCreateSupervisor] = useState("none");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createStatus, setCreateStatus] = useState<AssignmentStatus>("pending");
  const [savingCreate, setSavingCreate] = useState(false);

  const load = useCallback(() => {
    return getPage<Assignment>("/admin/assignments", {
      status: filter === "all" ? undefined : filter,
      page,
    })
      .then((res) => {
        setError(null);
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load assignments."))
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

  const loadPickers = useCallback(async () => {
    setPickersLoading(true);
    try {
      const [studentsRes, supervisorsRes, internshipsRes] = await Promise.all([
        getPage<Student>("/admin/students", { per_page: 100 }),
        getPage<Supervisor>("/admin/supervisors", { per_page: 100 }),
        getPage<Internship>("/admin/internships", { approval_status: "approved", per_page: 100 }),
      ]);
      setStudents(studentsRes.items);
      setSupervisors(supervisorsRes.items);
      setInternships(internshipsRes.items.filter((i) => i.is_published));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load picker data.");
    } finally {
      setPickersLoading(false);
    }
  }, []);

  const openEdit = (assignment: Assignment) => {
    setEditTarget(assignment);
    setEditSupervisor(assignment.supervisor_id ? String(assignment.supervisor_id) : "none");
    setEditStatus(assignment.status);
    setEditStart(assignment.start_date?.slice(0, 10) ?? "");
    setEditEnd(assignment.end_date?.slice(0, 10) ?? "");
    if (supervisors.length === 0) void loadPickers();
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    if (!editStart || !editEnd) {
      toast.error("Start and end dates are required.");
      return;
    }
    setSavingEdit(true);
    try {
      const payload: Record<string, unknown> = {
        status: editStatus,
        start_date: editStart,
        end_date: editEnd,
        supervisor_id: editSupervisor === "none" ? null : Number(editSupervisor),
      };
      await sendData("put", `/admin/assignments/${editTarget.id}`, payload);
      toast.success("Assignment updated.");
      setEditTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update assignment.");
    } finally {
      setSavingEdit(false);
    }
  };

  const openCreate = () => {
    setCreateOpen(true);
    setCreateStudent("");
    setCreateInternship("");
    setCreateSupervisor("none");
    setCreateStart("");
    setCreateEnd("");
    setCreateStatus("pending");
    if (students.length === 0) void loadPickers();
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStudent || !createInternship) {
      toast.error("Student and internship are required.");
      return;
    }
    if (!createStart || !createEnd) {
      toast.error("Start and end dates are required.");
      return;
    }
    if (createEnd < createStart) {
      toast.error("End date must be after the start date.");
      return;
    }
    setSavingCreate(true);
    try {
      const payload: Record<string, unknown> = {
        student_id: Number(createStudent),
        internship_id: Number(createInternship),
        start_date: createStart,
        end_date: createEnd,
        status: createStatus,
      };
      if (createSupervisor !== "none") payload.supervisor_id = Number(createSupervisor);
      await sendData("post", "/admin/assignments", payload);
      toast.success("Assignment created.");
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create assignment.");
    } finally {
      setSavingCreate(false);
    }
  };

  const supervisorItems = {
    none: "Unassigned",
    ...Object.fromEntries(supervisors.map((s) => [String(s.id), supervisorLabel(s)])),
  };

  const studentItems = Object.fromEntries(
    students.map((s) => [
      String(s.id),
      `${s.user?.name ?? `Student #${s.id}`} (${s.student_id ?? s.id})`,
    ]),
  );

  const internshipItems = Object.fromEntries(
    internships.map((i) => [String(i.id), `${i.title} — ${i.company?.company_name ?? "Company"}`]),
  );

  const columns: Column<Assignment>[] = [
    {
      header: "Student",
      cell: (a) => (
        <div>
          <p className="font-medium">{a.student?.user?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{a.student?.student_id ?? ""}</p>
        </div>
      ),
    },
    { header: "Internship", cell: (a) => a.internship?.title ?? "—" },
    { header: "Company", cell: (a) => a.company?.company_name ?? "—" },
    {
      header: "Supervisor",
      cell: (a) => (a.supervisor_id ? supervisorName(a.supervisor) : "Unassigned"),
    },
    {
      header: "Period",
      cell: (a) => (
        <span className="whitespace-nowrap">
          {formatDate(a.start_date)} &rarr; {formatDate(a.end_date)}
        </span>
      ),
    },
    { header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
    {
      header: "Actions",
      cell: (a) => (
        <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(a)}>
          <Pencil className="size-4" />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Place students into internships and assign supervisors.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filter}
          items={STATUS_ITEMS}
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
        <Button className="ml-auto gap-1" onClick={openCreate}>
          <Plus className="size-4" />
          Create Assignment
        </Button>
      </div>

      {error ? (
        <EmptyState
          title="Failed to load assignments"
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
            emptyTitle="No assignments found"
            emptyDescription={filter !== "all" ? "Try another status filter." : undefined}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit assignment</DialogTitle>
            <DialogDescription>
              {editTarget?.student?.user?.name ?? "Student"} &rarr;{" "}
              {editTarget?.internship?.title ?? "Internship"}
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Supervisor</Label>
                {pickersLoading ? (
                  <LoadingSpinner label="Loading supervisors..." />
                ) : (
                  <Select
                    value={editSupervisor}
                    items={supervisorItems}
                    onValueChange={(v) => setEditSupervisor(String(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {supervisors.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {supervisorName(s)}
                          {s.department ? ` — ${s.department}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <StatusSelect value={editStatus} onChange={setEditStatus} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-start">Start date</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end">End date</Label>
                  <Input
                    id="edit-end"
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={savingEdit} onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={submitEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create assignment</DialogTitle>
            <DialogDescription>Assign a student to an approved internship.</DialogDescription>
          </DialogHeader>
          {pickersLoading ? (
            <LoadingSpinner label="Loading students and internships..." />
          ) : (
            <form onSubmit={submitCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select
                  value={createStudent}
                  items={studentItems}
                  onValueChange={(v) => setCreateStudent(String(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.user?.name ?? `Student #${s.id}`} ({s.student_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Internship</Label>
                <Select
                  value={createInternship}
                  items={internshipItems}
                  onValueChange={(v) => setCreateInternship(String(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select internship" />
                  </SelectTrigger>
                  <SelectContent>
                    {internships.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No published internships
                      </SelectItem>
                    ) : (
                      internships.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.title} — {i.company?.company_name ?? "Company"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supervisor (optional)</Label>
                <Select
                  value={createSupervisor}
                  items={supervisorItems}
                  onValueChange={(v) => setCreateSupervisor(String(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {supervisors.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {supervisorLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-start">Start date</Label>
                  <Input
                    id="create-start"
                    type="date"
                    value={createStart}
                    onChange={(e) => setCreateStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-end">End date</Label>
                  <Input
                    id="create-end"
                    type="date"
                    value={createEnd}
                    onChange={(e) => setCreateEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <StatusSelect value={createStatus} onChange={setCreateStatus} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={savingCreate} onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingCreate}>
                  {savingCreate ? "Creating..." : "Create assignment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
