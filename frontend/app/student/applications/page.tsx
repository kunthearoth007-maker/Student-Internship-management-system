"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Ban, CalendarClock, CheckCircle2, FileText, XCircle } from "lucide-react";
import { AppPagination } from "@/components/shared/AppPagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError, getPage, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Application, PageMeta } from "@/types";

const CANCELLABLE: Application["status"][] = ["pending", "reviewing"];

export default function StudentApplicationsPage() {
  const [rows, setRows] = useState<Application[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toCancel, setToCancel] = useState<Application | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [toDecline, setToDecline] = useState<Application | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [responding, setResponding] = useState(false);

  const load = useCallback(() => {
    return getPage<Application>("/student/applications", { page, per_page: 10 })
      .then((res) => {
        setRows(res.items ?? []);
        setMeta(res.meta);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load applications"))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await sendData("put", `/student/applications/${toCancel.id}/cancel`);
      toast.success("Application cancelled");
      setToCancel(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel application");
    } finally {
      setCancelling(false);
    }
  };

  const respond = async (application: Application, action: "accept-offer" | "decline-offer") => {
    setResponding(true);
    try {
      const response = await sendData<{ message?: string }>(
        "put",
        `/student/applications/${application.id}/${action}`,
        action === "decline-offer" && declineReason.trim() ? { reason: declineReason.trim() } : undefined
      );
      toast.success(response.message ?? (action === "accept-offer" ? "Offer accepted" : "Offer declined"));
      setToDecline(null);
      setDeclineReason("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record your response");
    } finally {
      setResponding(false);
    }
  };

  const offers = rows.filter((row) => row.status === "offered");

  const columns: Column<Application>[] = [
    {
      header: "Internship",
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium">{row.internship?.title ?? `Internship #${row.internship_id}`}</p>
          <p className="text-xs text-muted-foreground">
            {row.internship?.company?.company_name ?? "Company"}
          </p>
        </div>
      ),
    },
    {
      header: "Location",
      cell: (row) => <span className="text-sm">{row.internship?.location ?? "—"}</span>,
    },
    {
      header: "Applied",
      cell: (row) => <span className="text-sm">{formatDate(row.applied_at)}</span>,
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/student/internships/${row.internship_id}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            View post
          </Link>
          {row.status === "offered" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-full border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50"
                disabled={responding}
                onClick={() => respond(row, "accept-offer")}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-full text-xs text-slate-600"
                disabled={responding}
                onClick={() => setToDecline(row)}
              >
                Decline
              </Button>
            </>
          )}
          {CANCELLABLE.includes(row.status) && (
            <button
              type="button"
              onClick={() => setToCancel(row)}
              className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] font-medium text-destructive hover:bg-destructive/10"
            >
              <Ban className="size-3.5" /> Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
        <p className="text-sm text-muted-foreground">
          Follow the progress of every internship application you have sent.
        </p>
      </div>

      {offers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Offers awaiting your reply</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {offers.length}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <Card key={offer.id} className="border-primary/30 bg-blue-50/40 shadow-sm">
                <CardContent className="space-y-3 pt-5">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {offer.internship?.title ?? `Internship #${offer.internship_id}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {offer.internship?.company?.company_name ?? "Company"} ·{" "}
                      {offer.internship?.location ?? "—"}
                    </p>
                  </div>

                  {offer.offer_note && (
                    <p className="flex items-start gap-2 rounded-lg bg-card/70 px-3 py-2 text-sm text-slate-700">
                      <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                      {offer.offer_note}
                    </p>
                  )}

                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" />
                    Sent {formatDate(offer.offered_at)}
                    {offer.offer_deadline && (
                      <>
                        {" · "}
                        <span
                          className={
                            new Date(offer.offer_deadline) < new Date()
                              ? "font-semibold text-rose-600"
                              : "font-semibold text-slate-700"
                          }
                        >
                          Reply by {formatDate(offer.offer_deadline)}
                        </span>
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      className="gap-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                      disabled={responding}
                      onClick={() => respond(offer, "accept-offer")}
                    >
                      <CheckCircle2 className="size-4" /> Accept offer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-full"
                      disabled={responding}
                      onClick={() => setToDecline(offer)}
                    >
                      <XCircle className="size-4" /> Decline
                    </Button>
                    <Link
                      href={`/student/internships/${offer.internship_id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            rowKey={(row) => row.id}
            emptyTitle="No applications yet"
            emptyDescription="Apply to an internship and it will show up here."
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={toCancel !== null}
        onOpenChange={(open) => !open && setToCancel(null)}
        title="Cancel application?"
        description={
          toCancel
            ? `Cancel your application for "${toCancel.internship?.title ?? "this internship"}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Cancel application"
        destructive
        loading={cancelling}
        onConfirm={confirmCancel}
      />

      <Dialog open={toDecline !== null} onOpenChange={(open) => !open && setToDecline(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this offer?</DialogTitle>
            <DialogDescription>
              {toDecline?.internship?.company?.company_name ?? "The company"} and your supervisor
              will be told that you turned the offer down.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="I accepted another internship closer to home."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={responding} onClick={() => setToDecline(null)}>
              Keep the offer
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={responding || !toDecline}
              onClick={() => toDecline && respond(toDecline, "decline-offer")}
            >
              {responding ? "Working..." : "Decline offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
