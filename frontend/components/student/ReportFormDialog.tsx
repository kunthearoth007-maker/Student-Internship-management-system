"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Assignment, Report } from "@/types";

export interface ReportFormValues {
  assignment_id: string;
  report_type: string;
  title: string;
  description: string;
  file: File | null;
}

const REPORT_TYPES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "final", label: "Final" },
];

/** Assignments a student may still report on. */
export function selectableAssignments(assignments: Assignment[]): Assignment[] {
  return assignments.filter((assignment) =>
    ["pending", "active"].includes(assignment.status)
  );
}

export function assignmentLabel(assignment: Assignment): string {
  const title = assignment.internship?.title ?? `Assignment #${assignment.id}`;
  const company = assignment.company?.company_name;
  return `${title}${company ? ` — ${company}` : ""} (${formatDate(assignment.start_date)} – ${formatDate(assignment.end_date)})`;
}

interface ReportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  assignments: Assignment[];
  report?: Report | null;
  submitLabel?: string;
  onSubmit: (values: ReportFormValues) => Promise<void>;
}

export function ReportFormDialog({
  open,
  onOpenChange,
  assignments,
  report,
  ...fields
}: ReportFormDialogProps) {
  const options = useMemo(() => {
    const selectable = selectableAssignments(assignments);
    if (report) {
      const current = assignments.find((item) => item.id === report.assignment_id);
      if (current && !selectable.some((item) => item.id === current.id)) {
        return [current, ...selectable];
      }
    }
    return selectable;
  }, [assignments, report]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Remounting on each open/close seeds the draft, so no effect mirrors props into state. */}
        <ReportForm
          key={`${open ? "open" : "closed"}-${report?.id ?? "new"}`}
          options={options}
          report={report}
          onOpenChange={onOpenChange}
          {...fields}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReportForm({
  onOpenChange,
  title,
  description,
  options,
  report,
  submitLabel = "Submit report",
  onSubmit,
}: Omit<ReportFormDialogProps, "open" | "assignments"> & { options: Assignment[] }) {
  const [assignmentId, setAssignmentId] = useState(() =>
    report ? String(report.assignment_id) : options.length > 0 ? String(options[0].id) : ""
  );
  const [reportType, setReportType] = useState(report?.report_type ?? "weekly");
  const [formTitle, setFormTitle] = useState(report?.title ?? "");
  const [details, setDetails] = useState(report?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fieldError = (field: string) =>
    errors[field] ?? (field === "description" ? errors.details : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId) {
      setErrors({ assignment_id: "Select an assignment first." });
      return;
    }
    if (!formTitle.trim()) {
      setErrors({ title: "Title is required." });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSubmit({
        assignment_id: assignmentId,
        report_type: reportType,
        title: formTitle.trim(),
        description: details.trim(),
        file,
      });
      onOpenChange(false);
      setFormTitle("");
      setDetails("");
      setFile(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
        setErrors(
          err.errors
            ? Object.fromEntries(
                Object.entries(err.errors).map(([key, value]) => [key, value[0]])
              )
            : {}
        );
      } else {
        toast.error("Failed to save report");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {description ?? "Weekly and monthly logs keep your supervisor up to date."}
        </DialogDescription>
      </DialogHeader>

      {options.length === 0 && !report ? (
        <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          You have no active assignment to report on yet. Reports become available once an
          application turns into an assignment.
        </p>
      ) : (
        <div className="space-y-2">
          <Label>Assignment</Label>
          <Select
            items={options.map((item) => ({ value: String(item.id), label: assignmentLabel(item) }))}
            value={assignmentId}
            onValueChange={(value) => setAssignmentId(value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an assignment" />
            </SelectTrigger>
            <SelectContent>
              {options.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {assignmentLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("assignment_id") && (
            <p className="text-xs text-destructive">{fieldError("assignment_id")}</p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Report type</Label>
          <Select
            items={REPORT_TYPES}
            value={reportType}
            onValueChange={(value) => setReportType(value ?? "weekly")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("report_type") && (
            <p className="text-xs text-destructive">{fieldError("report_type")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-title">Title</Label>
          <Input
            id="report-title"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Week 3 progress report"
          />
          {fieldError("title") && <p className="text-xs text-destructive">{fieldError("title")}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-description">Description</Label>
        <Textarea
          id="report-description"
          rows={5}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="What did you accomplish, what did you learn, any blockers?"
        />
        {fieldError("description") && (
          <p className="text-xs text-destructive">{fieldError("description")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-file">Attachment (optional)</Label>
        <Input
          id="report-file"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">PDF, Word or image, up to 10 MB.</p>
        {fieldError("file") && <p className="text-xs text-destructive">{fieldError("file")}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !assignmentId}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
