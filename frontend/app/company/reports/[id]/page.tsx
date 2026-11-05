"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ApiError, getData } from "@/lib/api";
import { fileUrl, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Report } from "@/types";

export default function CompanyReportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return getData<Report>(`/company/reports/${id}`)
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
        <Link href="/company/reports" className={buttonVariants({ variant: "outline" })}>
          Back to reports
        </Link>
      </div>
    );
  }

  const student = report.assignment?.student;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Report</h1>
        <StatusBadge status={report.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{report.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Student:</span> {student?.user?.name ?? "—"}</p>
            <p>
              <span className="text-muted-foreground">Internship:</span>{" "}
              {report.assignment?.internship?.title ?? "—"}
            </p>
            <p><span className="text-muted-foreground">Type:</span> {report.report_type}</p>
            <p><span className="text-muted-foreground">Submitted:</span> {formatDateTime(report.submitted_at)}</p>
            <p><span className="text-muted-foreground">Reviewed:</span> {formatDateTime(report.reviewed_at)}</p>
            <p>
              <span className="text-muted-foreground">Supervisor:</span>{" "}
              {report.assignment?.supervisor?.user?.name ?? "—"}
            </p>
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

      {report.feedbacks && report.feedbacks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Supervisor Feedback</CardTitle>
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
      ) : (
        <p className="text-sm text-muted-foreground">
          No supervisor feedback on this report yet. Only the assigned academic supervisor can review and
          comment on intern reports.
        </p>
      )}

      <Link href="/company/reports" className={buttonVariants({ variant: "outline" })}>
        Back to reports
      </Link>
    </div>
  );
}
