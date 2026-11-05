"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, getData } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Internship, InternshipPeriod } from "@/types";

const NO_PERIOD = "none";

export interface InternshipPayload {
  title: string;
  category: string;
  description: string;
  requirements: string;
  location: string;
  internship_type: string;
  positions: number;
  start_date: string;
  end_date: string;
  application_deadline: string;
  period_id: number | null;
}

const CATEGORIES = [
  "Technology",
  "Finance",
  "Marketing",
  "Business Administration",
  "Engineering",
  "Health",
  "Education",
  "Other",
];

const CATEGORY_ITEMS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c, c])
);

const TYPES: { value: string; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "remote", label: "Remote" },
  { value: "on_site", label: "On-site" },
];

const TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label])
);

interface FormState {
  title: string;
  category: string;
  description: string;
  requirements: string;
  location: string;
  internship_type: string;
  positions: string;
  start_date: string;
  end_date: string;
  application_deadline: string;
  period_id: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  category: "",
  description: "",
  requirements: "",
  location: "",
  internship_type: "",
  positions: "1",
  start_date: "",
  end_date: "",
  application_deadline: "",
  period_id: NO_PERIOD,
};

function toFormState(internship?: Internship | null): FormState {
  if (!internship) return { ...EMPTY_FORM };
  return {
    title: internship.title ?? "",
    category: internship.category ?? "",
    description: internship.description ?? "",
    requirements: internship.requirements ?? "",
    location: internship.location ?? "",
    internship_type: internship.internship_type ?? "",
    positions: String(internship.positions ?? 1),
    start_date: internship.start_date?.slice(0, 10) ?? "",
    end_date: internship.end_date?.slice(0, 10) ?? "",
    application_deadline: internship.application_deadline?.slice(0, 10) ?? "",
    period_id: internship.period_id ? String(internship.period_id) : NO_PERIOD,
  };
}

export function InternshipFormDialog({
  open,
  onOpenChange,
  internship,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  internship?: Internship | null;
  onSubmit: (values: InternshipPayload) => Promise<void>;
}) {
  // Parent remounts this dialog (via key) when `open` toggles or `internship` changes,
  // so lazy initialisation from props is enough.
  const [form, setForm] = useState<FormState>(() => toFormState(internship));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [periods, setPeriods] = useState<InternshipPeriod[]>([]);

  useEffect(() => {
    let cancelled = false;
    getData<InternshipPeriod[]>("/periods")
      .then((rows) => {
        if (!cancelled) setPeriods(rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setPeriods([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const periodItems: Record<string, string> = {
    [NO_PERIOD]: "Not scheduled",
    ...Object.fromEntries(
      periods.map((period) => [
        String(period.id),
        `${period.name}${period.is_active ? "" : " (closed)"}`,
      ])
    ),
  };

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const fieldError = (field: string) => errors[field];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const missing: string[] = [];
    if (!form.title.trim()) missing.push("title");
    if (!form.category) missing.push("category");
    if (!form.description.trim()) missing.push("description");
    if (!form.location.trim()) missing.push("location");
    if (!form.internship_type) missing.push("internship_type");
    if (!form.start_date) missing.push("start_date");
    if (!form.end_date) missing.push("end_date");
    if (!form.application_deadline) missing.push("application_deadline");
    if (missing.length > 0) {
      setErrors(Object.fromEntries(missing.map((f) => [f, "This field is required."])));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        location: form.location.trim(),
        internship_type: form.internship_type,
        positions: Math.max(1, Number(form.positions) || 1),
        start_date: form.start_date,
        end_date: form.end_date,
        application_deadline: form.application_deadline,
        period_id: form.period_id === NO_PERIOD ? null : Number(form.period_id),
      });
    } catch (err) {
      if (err instanceof ApiError) {
        const flat: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors ?? {})) {
          flat[field] = messages[0] ?? "Invalid value";
        }
        setErrors(flat);
        toast.error(err.message);
      } else {
        toast.error("Failed to save internship");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{internship ? "Edit Internship" : "Create Internship"}</DialogTitle>
          <DialogDescription>
            {internship
              ? "Updating this position will send it back for admin approval."
              : "Publish a new internship position. It requires admin approval before publishing."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="internship-title">Title</Label>
            <Input
              id="internship-title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. Frontend Developer Intern"
            />
            {fieldError("title") && (
              <p className="text-xs text-destructive">{fieldError("title")}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(next) => setField("category", next ?? "")}
                items={CATEGORY_ITEMS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("category") && (
                <p className="text-xs text-destructive">{fieldError("category")}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select
                value={form.internship_type}
                onValueChange={(next) => setField("internship_type", next ?? "")}
                items={TYPE_ITEMS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("internship_type") && (
                <p className="text-xs text-destructive">{fieldError("internship_type")}</p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="internship-location">Location</Label>
            <Input
              id="internship-location"
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="e.g. Phnom Penh, Cambodia"
            />
            {fieldError("location") && (
              <p className="text-xs text-destructive">{fieldError("location")}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="internship-description">Description</Label>
            <Textarea
              id="internship-description"
              rows={4}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Describe the role, responsibilities and learning opportunities..."
            />
            {fieldError("description") && (
              <p className="text-xs text-destructive">{fieldError("description")}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="internship-requirements">Requirements</Label>
            <Textarea
              id="internship-requirements"
              rows={3}
              value={form.requirements}
              onChange={(e) => setField("requirements", e.target.value)}
              placeholder="Skills, majors or year levels you expect..."
            />
            {fieldError("requirements") && (
              <p className="text-xs text-destructive">{fieldError("requirements")}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="internship-positions">Positions</Label>
              <Input
                id="internship-positions"
                type="number"
                min={1}
                value={form.positions}
                onChange={(e) => setField("positions", e.target.value)}
              />
              {fieldError("positions") && (
                <p className="text-xs text-destructive">{fieldError("positions")}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="internship-start">Start Date</Label>
              <Input
                id="internship-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
              />
              {fieldError("start_date") && (
                <p className="text-xs text-destructive">{fieldError("start_date")}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="internship-end">End Date</Label>
              <Input
                id="internship-end"
                type="date"
                value={form.end_date}
                onChange={(e) => setField("end_date", e.target.value)}
              />
              {fieldError("end_date") && (
                <p className="text-xs text-destructive">{fieldError("end_date")}</p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5 sm:w-1/2">
            <Label htmlFor="internship-deadline">Application Deadline</Label>
            <Input
              id="internship-deadline"
              type="date"
              value={form.application_deadline}
              onChange={(e) => setField("application_deadline", e.target.value)}
            />
            {fieldError("application_deadline") && (
              <p className="text-xs text-destructive">
                {fieldError("application_deadline")}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>Internship Period</Label>
            <Select
              value={form.period_id}
              onValueChange={(next) => setField("period_id", next ?? NO_PERIOD)}
              items={periodItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {periods.length > 0
                ? "Link the posting to an academic period so the office can track it."
                : "No periods exist yet — the internship office creates them under Admin › Periods."}
            </p>
            {fieldError("period_id") && (
              <p className="text-xs text-destructive">{fieldError("period_id")}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : internship
                  ? "Save Changes"
                  : "Create Internship"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
