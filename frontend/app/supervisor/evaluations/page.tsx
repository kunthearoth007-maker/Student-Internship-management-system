"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, getData, getPage, sendData } from "@/lib/api";
import { DataTable } from "@/components/shared/DataTable";
import { AppPagination } from "@/components/shared/AppPagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Assignment, Evaluation, PageMeta } from "@/types";

const CRITERIA: { key: keyof Omit<Evaluation, "id">; label: string }[] = [
  { key: "technical_score", label: "Technical Skills" },
  { key: "communication_score", label: "Communication" },
  { key: "teamwork_score", label: "Teamwork" },
  { key: "attendance_score", label: "Attendance" },
  { key: "professionalism_score", label: "Professionalism" },
];

type Scores = Record<string, number>;

const initialScores = (): Scores =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, 5]));

export default function SupervisorEvaluationsPage() {
  const [rows, setRows] = useState<Evaluation[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [interns, setInterns] = useState<Assignment[]>([]);
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [scores, setScores] = useState<Scores>(initialScores());
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return getPage<Evaluation>("/evaluations", { page, per_page: 10 })
      .then((res) => {
        setRows(res.items);
        setMeta(res.meta);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load evaluations"))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const openDialog = async () => {
    setOpen(true);
    setScores(initialScores());
    setComment("");
    try {
      const data = await getData<{ students: Assignment[] }>("/supervisor/dashboard");
      setInterns(data.students);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load students");
    }
  };

  const submit = async () => {
    if (!assignmentId) {
      toast.error("Please select a student.");
      return;
    }
    setSaving(true);
    try {
      await sendData("post", "/supervisor/evaluations", {
        assignment_id: Number(assignmentId),
        ...Object.fromEntries(CRITERIA.map((c) => [c.key, scores[c.key]])),
        comment,
      });
      toast.success("Evaluation saved");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save evaluation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Evaluations</h1>
          <p className="text-sm text-muted-foreground">Rate students on a 1-5 scale (1-5).</p>
        </div>
        <Button onClick={openDialog}>Evaluate Student</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            emptyTitle="No evaluations yet"
            columns={[
              {
                header: "Student",
                cell: (r) => r.assignment?.student?.user?.name ?? "—",
              },
              { header: "Internship", cell: (r) => r.assignment?.internship?.title ?? "—" },
              { header: "Technical", cell: (r) => `${r.technical_score} / 5` },
              { header: "Communication", cell: (r) => `${r.communication_score} / 5` },
              { header: "Teamwork", cell: (r) => `${r.teamwork_score} / 5` },
              { header: "Attendance", cell: (r) => `${r.attendance_score} / 5` },
              { header: "Professionalism", cell: (r) => `${r.professionalism_score} / 5` },
              {
                header: "Overall",
                cell: (r) => <span className="font-semibold">{r.overall_score} / 5</span>,
              },
            ]}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Evaluate Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select
                value={assignmentId}
                items={Object.fromEntries(
                  interns.map((a) => [
                    String(a.id),
                    `${a.student?.user?.name ?? `Student #${a.student_id}`} — ${a.internship?.title} (${a.status})`,
                  ]),
                )}
                onValueChange={(v) => setAssignmentId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select assigned student" />
                </SelectTrigger>
                <SelectContent>
                  {interns.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.student?.user?.name ?? `Student #${a.student_id}`} — {a.internship?.title} ({a.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {CRITERIA.map((c) => (
              <div key={c.key} className="space-y-2">
                <Label>{c.label}</Label>
                <Select
                  value={String(scores[c.key])}
                  items={Object.fromEntries([1, 2, 3, 4, 5].map((n) => [String(n), `${n} / 5`]))}
                  onValueChange={(v) => {
                    if (!v) return;
                    setScores((s) => ({ ...s, [c.key]: Number(v) }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / 5
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                rows={3}
                placeholder="Good performance during the internship period..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              Overall:{' '}
              <span className="font-bold">
                {(
                  Object.values(scores).reduce((a, b) => a + b, 0) / 5
                ).toFixed(1)}{' '}
                / 5
              </span>
            </div>
            <Button className="w-full" onClick={submit} disabled={saving}>
              {saving ? "Saving..." : "Submit Evaluation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
