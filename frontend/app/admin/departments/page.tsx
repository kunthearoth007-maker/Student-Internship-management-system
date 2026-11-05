"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError, getData, sendData } from "@/lib/api";
import type { Department } from "@/types";

interface FormState {
  id: number | null;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

const blank = (): FormState => ({ id: null, name: "", code: "", description: "", is_active: true });

export default function AdminDepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return getData<Department[]>("/admin/departments")
      .then((rows) => {
        setError(null);
        setItems(rows);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load departments."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load();
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Department name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        is_active: form.is_active,
      };
      if (form.id) {
        await sendData("put", `/admin/departments/${form.id}`, payload);
        toast.success("Department updated");
      } else {
        await sendData("post", "/admin/departments", payload);
        toast.success("Department created");
      }
      setDialogOpen(false);
      setForm(blank());
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.fieldError("name") ?? err.fieldError("code") ?? err.message
          : "Could not save the department"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await sendData("delete", `/admin/departments/${deleteTarget.id}`);
      toast.success("Department deleted");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the department");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Department>[] = [
    {
      header: "Department",
      cell: (d) => (
        <div className="min-w-40">
          <p className="font-medium text-slate-900">{d.name}</p>
          {d.description && (
            <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{d.description}</p>
          )}
        </div>
      ),
    },
    { header: "Code", cell: (d) => d.code ?? "—" },
    { header: "Students", cell: (d) => d.students_count ?? 0 },
    { header: "Supervisors", cell: (d) => d.supervisors_count ?? 0 },
    {
      header: "Status",
      cell: (d) => (
        <Badge
          variant="outline"
          className={
            d.is_active
              ? "rounded-full border-transparent bg-emerald-100 text-emerald-700"
              : "rounded-full border-transparent bg-slate-100 text-slate-600"
          }
        >
          {d.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (d) => (
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setForm({
                id: d.id,
                name: d.name,
                code: d.code ?? "",
                description: d.description ?? "",
                is_active: d.is_active,
              });
              setDialogOpen(true);
            }}
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button
            size="xs"
            variant="ghost"
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteTarget(d)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Faculties and departments that students and supervisors belong to.
          </p>
        </div>
        <Button
          className="gap-1 rounded-full bg-primary px-4 hover:bg-primary-hover"
          onClick={() => {
            setForm(blank());
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> New department
        </Button>
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardContent className="pt-5">
          {error ? (
            <EmptyState
              title="Failed to load departments"
              description={error}
              action={{ label: "Retry", onClick: retry }}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={items}
              loading={loading}
              rowKey={(d) => d.id}
              emptyTitle="No departments yet"
              emptyDescription="Create the faculties used by RUPP internship programmes."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit department" : "New department"}</DialogTitle>
            <DialogDescription>
              Deleting a department unlinks its students and supervisors rather than removing them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department-name">Name</Label>
              <Input
                id="department-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Faculty of Information Technology"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-code">Code</Label>
              <Input
                id="department-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="IT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-description">Description</Label>
              <Textarea
                id="department-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="size-4 rounded border-slate-300"
              />
              Active (available when assigning profiles)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-primary hover:bg-primary-hover"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving..." : form.id ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "department"}?`}
        description="Students and supervisors in this department will be left without one."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={remove}
      />
    </div>
  );
}
