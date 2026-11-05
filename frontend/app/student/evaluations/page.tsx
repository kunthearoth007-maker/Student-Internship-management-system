"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Building, Star, User } from "lucide-react";
import { AppPagination } from "@/components/shared/AppPagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getPage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Evaluation, PageMeta } from "@/types";

const SCORE_ROWS: { key: keyof Evaluation; label: string }[] = [
  { key: "technical_score", label: "Technical Skills" },
  { key: "communication_score", label: "Communication" },
  { key: "teamwork_score", label: "Teamwork" },
  { key: "attendance_score", label: "Attendance" },
  { key: "professionalism_score", label: "Professionalism" },
];

function ScoreRow({ label, score }: { label: string; score: number }) {
  const clamped = Math.max(0, Math.min(5, Number.isFinite(score) ? score : 0));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{clamped.toFixed(1)} / 5</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(clamped / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentEvaluationsPage() {
  const [items, setItems] = useState<Evaluation[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return getPage<Evaluation>("/evaluations", { page })
      .then((res) => {
        setItems(res.items ?? []);
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">My Evaluations</h1>
        <p className="text-sm text-muted-foreground">
          Feedback scored by your host company and university supervisor.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading evaluations..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No evaluations yet"
          description="Your supervisors score your internship once it is underway or completed."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((evaluation) => {
              const isCompany = evaluation.evaluator_type === "company";
              return (
                <Card key={evaluation.id}>
                  <CardHeader className="gap-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="text-base leading-tight">
                          {evaluation.assignment?.internship?.title ??
                            evaluation.assignment?.company?.company_name ??
                            `Assignment #${evaluation.assignment_id}`}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5">
                          <Building className="size-3.5" />
                          {evaluation.assignment?.company?.company_name ?? "Company"}
                        </CardDescription>
                      </div>
                      <Badge variant={isCompany ? "secondary" : "outline"} className="shrink-0">
                        {isCompany ? (
                          <>
                            <Building /> Company
                          </>
                        ) : (
                          <>
                            <User /> Supervisor
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="pt-1 text-xs text-muted-foreground">
                      {evaluation.evaluator?.name ? `By ${evaluation.evaluator.name} · ` : ""}
                      {formatDate(evaluation.assignment?.end_date)}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="space-y-3">
                        {SCORE_ROWS.map((row) => (
                          <ScoreRow
                            key={row.key}
                            label={row.label}
                            score={Number(evaluation[row.key])}
                          />
                        ))}
                      </div>

                      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border bg-muted/40 px-6 py-4">
                        <Star className="size-5 text-amber-500" />
                        <p className="text-2xl font-bold tabular-nums">
                          {Math.max(0, Math.min(5, Number(evaluation.overall_score) || 0)).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">Overall / 5</p>
                      </div>
                    </div>

                    {evaluation.comment && (
                      <blockquote className="rounded-lg border-l-2 border-primary/40 bg-muted/30 p-3 text-sm text-muted-foreground italic">
                        &ldquo;{evaluation.comment}&rdquo;
                      </blockquote>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}
    </div>
  );
}
