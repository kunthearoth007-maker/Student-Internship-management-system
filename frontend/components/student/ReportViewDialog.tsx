"use client";

import { ExternalLink, MessageSquare, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fileUrl, formatDate, formatDateTime } from "@/lib/format";
import type { Report } from "@/types";

export function ReportViewDialog({
  open,
  onOpenChange,
  report,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
}) {
  const url = fileUrl(report?.file);
  const feedbacks = report?.feedbacks ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{report?.title ?? "Report"}</DialogTitle>
          <DialogDescription>
            {report ? (
              <>
                {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} report
                {" · "}
                {report.assignment?.internship?.title ??
                  report.assignment?.company?.company_name ??
                  "Assignment"}
              </>
            ) : undefined}
          </DialogDescription>
        </DialogHeader>

        {report && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={report.status} />
              <Badge variant="secondary">{report.report_type}</Badge>
              <span className="text-xs text-muted-foreground">
                Submitted {formatDateTime(report.submitted_at)}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Description</p>
              <div className="space-y-1 text-sm whitespace-pre-line text-muted-foreground">
                {report.description ? (
                  report.description
                ) : (
                  <p>No description provided.</p>
                )}
              </div>
            </div>

            {url && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Attachment</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Paperclip /> Open file
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="size-4" /> Supervisor feedback ({feedbacks.length})
              </p>
              {feedbacks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback yet.</p>
              ) : (
                <ul className="space-y-2">
                  {feedbacks.map((feedback) => (
                    <li key={feedback.id} className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {feedback.supervisor?.name ??
                            feedback.supervisor?.user?.name ??
                            "Supervisor"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(feedback.created_at)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                        {feedback.feedback}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
