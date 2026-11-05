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
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError, getData, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { InternshipPeriod } from "@/types";

interface FormState {
  id: number | null;
  name: string;
  starts_on: string;
  ends_on: string;
  application_opens_on: string;
  application_closes_on: string;
  is_active: boolean;
}

const blank = (): FormState => ({
  id: null,
  name: "",
  starts_on: "",
  ends_on: "",
  application_opens_on: "",
  application_closes_on: "",
  is_active: true,
});

export default function AdminPeriodsPage() {
  const [items, setItems] = useState<InternshipPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InternshipPeriod | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return getData<InternshipPeriod[]>("/admin/periods")
      .then((rows) => {
        setError(null);
        setItems(rows);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load periods."))
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
    if (!form.name.trim() || !form.starts_on || !form.ends_on) {
      toast.error("Name, start date and end date are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        starts_on: form.starts_on,
        ends_on: form.ends_on,
        application_opens_on: form.application_opens_on || undefined,
        application_closes_on: form.application_closes_on || undefined,
        is_active: form.is_active,
      };
      if (form.id) {
        await sendData("put", `/admin/periods/${form.id}`, payload);
        toast.success("Period updated");
      } else {
        await sendData("post", "/admin/periods", payload);
        toast.success("Period created");
      }
      setDialogOpen(false);
      setForm(blank());
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.fieldError("ends_on") ?? err.fieldError("name") ?? err.message
          : "Could not save the period"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await sendData("delete", `/admin/periods/${deleteTarget.id}`);
      toast.success("Period deleted");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the period");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<InternshipPeriod>[] = [
    {
      header: "Period",
      cell: (p) => <span className="font-medium text-slate-900">{p.name}</span>,
    },
    {
      header: "Internship window",
      cell: (p) => (
        <span className="whitespace-nowrap text-sm">
          {formatDate(p.starts_on)} → {formatDate(p.ends_on)}
        </span>
      ),
    },
    {
      header: "Applications",
      cell: (p) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {p.application_opens_on || p.application_closes_on
            ? `${formatDate(p.application_opens_on)} → ${formatDate(p.application_closes_on)}`
            : "Open anytime"}
        </span>
      ),
    },
    { header: "Internships", cell: (p) => p.internships_count ?? 0 },
    {
      header: "Status",
      cell: (p) => (
        <Badge
          variant="outline"
          className={
            p.is_active
              ? "rounded-full border-transparent bg-emerald-100 text-emerald-700"
              : "rounded-full border-transparent bg-slate-100 text-slate-600"
          }
        >
          {p.is_active ? "Active" : "Closed"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (p) => (
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setForm({
                id: p.id,
                name: p.name,
                starts_on: p.starts_on,
                ends_on: p.ends_on,
                application_opens_on: p.application_opens_on ?? "",
                application_closes_on: p.application_closes_on ?? "",
                is_active: p.is_active,
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
            onClick={() => setDeleteTarget(p)}
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
          <h1 className="text-2xl font-bold tracking-tight">Internship periods</h1>
          <p className="text-sm text-muted-foreground">
            Academic terms that internships and application windows follow.
          </p>
        </div>
        <Button
          className="gap-1 rounded-full bg-primary px-4 hover:bg-primary-hover"
          onClick={() => {
            setForm(blank());
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> New period
        </Button>
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardContent className="pt-5">
          {error ? (
            <EmptyState
              title="Failed to load periods"
              description={error}
              action={{ label: "Retry", onClick: retry }}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={items}
              loading={loading}
              rowKey={(p) => p.id}
              emptyTitle="No periods yet"
              emptyDescription="Create the term students are currently applying for."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit period" : "New period"}</DialogTitle>
            <DialogDescription>
              Deleting a period keeps its internships but leaves them without a term.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period-name">Name</Label>
              <Input
                id="period-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Summer 2026"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="period-start">Starts</Label>
                <Input
                  id="period-start"
                  type="date"
                  value={form.starts_on}
                  onChange={(e) => setForm({ ...form, starts_on: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-end">Ends</Label>
                <Input
                  id="period-end"
                  type="date"
                  value={form.ends_on}
                  onChange={(e) => setForm({ ...form, ends_on: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-app-open">Applications open</Label>
                <Input
                  id="period-app-open"
                  type="date"
                  value={form.application_opens_on}
                  onChange={(e) => setForm({ ...form, application_opens_on: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-app-close">Applications close</Label>
                <Input
                  id="period-app-close"
                  type="date"
                  value={form.application_closes_on}
                  onChange={(e) => setForm({ ...form, application_closes_on: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="size-4 rounded border-slate-300"
              />
              Active (selectable when posting internships)
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
              {saving ? "Saving..." : form.id ? "Save changes" : "Create period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "period"}?`}
        description="Internships in this period will no longer show a term."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={remove}
      />
    </div>
  );
}
