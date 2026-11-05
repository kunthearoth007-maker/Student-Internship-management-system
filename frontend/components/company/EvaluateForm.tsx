"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface EvaluationValues {
  technical_score: number;
  communication_score: number;
  teamwork_score: number;
  attendance_score: number;
  professionalism_score: number;
  comment?: string;
}

type ScoreField =
  | "technical_score"
  | "communication_score"
  | "teamwork_score"
  | "attendance_score"
  | "professionalism_score";

const CRITERIA: { key: ScoreField; label: string }[] = [
  { key: "technical_score", label: "Technical Skills" },
  { key: "communication_score", label: "Communication" },
  { key: "teamwork_score", label: "Teamwork" },
  { key: "attendance_score", label: "Attendance" },
  { key: "professionalism_score", label: "Professionalism" },
];

const SCORE_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "1 - Needs improvement" },
  { value: "2", label: "2 - Below expectations" },
  { value: "3", label: "3 - Meets expectations" },
  { value: "4", label: "4 - Exceeds expectations" },
  { value: "5", label: "5 - Outstanding" },
];

const SCORE_ITEMS: Record<string, string> = {
  "1": "1 - Needs improvement",
  "2": "2 - Below expectations",
  "3": "3 - Meets expectations",
  "4": "4 - Exceeds expectations",
  "5": "5 - Outstanding",
};

type StringForm = Record<ScoreField, string> & { comment: string };

type InitialValues = Omit<Partial<EvaluationValues>, "comment"> & {
  comment?: string | null;
};

function toStringForm(initial?: InitialValues): StringForm {
  return {
    technical_score: initial?.technical_score ? String(initial.technical_score) : "",
    communication_score: initial?.communication_score
      ? String(initial.communication_score)
      : "",
    teamwork_score: initial?.teamwork_score ? String(initial.teamwork_score) : "",
    attendance_score: initial?.attendance_score ? String(initial.attendance_score) : "",
    professionalism_score: initial?.professionalism_score
      ? String(initial.professionalism_score)
      : "",
    comment: initial?.comment ?? "",
  };
}

export function EvaluateForm({
  initialValues,
  submitLabel = "Submit Evaluation",
  loading,
  onSubmit,
  onCancel,
}: {
  initialValues?: InitialValues;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: (values: EvaluationValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<StringForm>(() => toStringForm(initialValues));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = submitting || !!loading;

  const setField = (key: keyof StringForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = CRITERIA.find(({ key }) => !form[key]);
    if (missing) {
      setError(`Please select a score for ${missing.label}.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        technical_score: Number(form.technical_score),
        communication_score: Number(form.communication_score),
        teamwork_score: Number(form.teamwork_score),
        attendance_score: Number(form.attendance_score),
        professionalism_score: Number(form.professionalism_score),
        comment: form.comment || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {CRITERIA.map(({ key, label }) => (
        <div key={key} className="grid gap-1.5">
          <Label htmlFor={`evaluate-${key}`}>{label}</Label>
          <Select
            value={form[key]}
            onValueChange={(next) => setField(key, next ?? "")}
            items={SCORE_ITEMS}
          >
            <SelectTrigger id={`evaluate-${key}`} className="w-full">
              <SelectValue placeholder="Select a score (1-5)" />
            </SelectTrigger>
            <SelectContent>
              {SCORE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <div className="grid gap-1.5">
        <Label htmlFor="evaluate-comment">Comment</Label>
        <Textarea
          id="evaluate-comment"
          rows={4}
          placeholder="Overall performance feedback for the intern..."
          value={form.comment}
          onChange={(e) => setField("comment", e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
