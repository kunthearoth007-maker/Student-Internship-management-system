"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { ApiError, getData, sendData } from "@/lib/api";
import { fileUrl, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Report } from "@/types";

export default function ReportReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [working, setWorking] = useState<"approve" | "revision" | "feedback" | null>(null);

  const load = useCallback(() => {
    return getData<Report>(`/supervisor/reports/${id}`)
      .then(setReport)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load report"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;
  if (!report) {
    return (
      <div className="space-y-4">
        <p>Report not found.</p>
        <Link href="/supervisor/reports" className={buttonVariants({ variant: "outline" })}>
          Back to reports
        </Link>
      </div>
    );
  }

  const student = report.assignment?.student;

  const act = async (kind: "approve" | "revision" | "feedback") => {
    if ((kind === "revision" || kind === "feedback") && !feedback.trim()) {
      toast.error("Please write feedback first.");
      return;
    }
    setWorking(kind);
    try {
      if (kind === "approve") {
        await sendData("put", `/supervisor/reports/${report.id}/approve`);
        toast.success("Report approved");
      } else if (kind === "revision") {
        await sendData("put", `/supervisor/reports/${report.id}/revision`, { feedback });
        toast.success("Revision requested");
      } else {
        await sendData("post", `/supervisor/reports/${report.id}/feedback`, { feedback });
        toast.success("Feedback added");
      }
      setFeedback("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Report Review</h1>
        <StatusBadge status={report.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{report.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Student:</span> {student?.user?.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Company:</span> {report.assignment?.company?.company_name ?? "—"}</p>
            <p><span className="text-muted-foreground">Type:</span> {report.report_type}</p>
            <p><span className="text-muted-foreground">Submitted:</span> {formatDateTime(report.submitted_at)}</p>
          </div>
          {report.description && (
            <div>
              <p className="mb-1 text-sm font-medium">Description</p>
              <p className="whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm">{report.description}</p>
            </div>
          )}
          {report.file && (
            <a href={fileUrl(report.file)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              View attached file
            </a>
          )}
        </CardContent>
      </Card>

      {report.feedbacks && report.feedbacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.feedbacks.map((f) => (
              <div key={f.id} className="rounded-md border p-3 text-sm">
                <p className="whitespace-pre-line">{f.feedback}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {f.supervisor?.name ?? f.supervisor?.user?.name ?? "Supervisor"} · {formatDateTime(f.created_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leave Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              rows={4}
              placeholder="Good progress this week. Please add more details about the project implementation."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => act("feedback")} disabled={working !== null}>
              Add feedback
            </Button>
            {report.status !== "approved" && (
              <Button onClick={() => act("approve")} disabled={working !== null}>
                <CheckCircle2 className="size-4" /> Approve
              </Button>
            )}
            {report.status !== "revision_required" && (
              <Button variant="destructive" onClick={() => act("revision")} disabled={working !== null}>
                <RotateCcw className="size-4" /> Request Revision
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
