"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ApiError, getPage, sendData } from "@/lib/api";
import { formatDate, fileUrl } from "@/lib/format";
import { AppPagination } from "@/components/shared/AppPagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Application, Internship, PageMeta } from "@/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "offered", label: "Offer sent" },
  { value: "accepted", label: "Offer accepted" },
  { value: "declined", label: "Offer declined" },
  { value: "expired", label: "Offer expired" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label])
);

const ALL_VALUE = "all";

export default function CompanyApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(ALL_VALUE);
  const [internshipId, setInternshipId] = useState(ALL_VALUE);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [internshipItems, setInternshipItems] = useState<Record<string, string>>({
    [ALL_VALUE]: "All internships",
  });
  const [actionId, setActionId] = useState<number | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<Application | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    getPage<Internship>("/company/internships", { page: 1 })
      .then((res) => {
        setInternships(res.items);
        setInternshipItems({
          [ALL_VALUE]: "All internships",
          ...Object.fromEntries(res.items.map((i) => [String(i.id), i.title])),
        });
      })
      .catch(() => {
        /* filter options are non-critical */
      });
  }, []);

  const load = useCallback(() => {
    return getPage<Application>("/company/applications", {
      page,
      status: status === ALL_VALUE ? undefined : status,
      internship_id: internshipId === ALL_VALUE ? undefined : internshipId,
    })
      .then((res) => {
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Failed to load applications");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, status, internshipId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    load();
  };

  const handleReview = async (application: Application) => {
    setActionId(application.id);
    try {
      await sendData("put", `/company/applications/${application.id}/review`);
      toast.success("Application marked as reviewing");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (application: Application) => {
    setActionId(application.id);
    try {
      await sendData("put", `/company/applications/${application.id}/reject`);
      toast.success("Application rejected");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const confirmAccept = async () => {
    if (!acceptTarget) return;
    setAccepting(true);
    try {
      const response = await sendData<{ message?: string }>(
        "put",
        `/company/applications/${acceptTarget.id}/accept`
      );
      toast.success(response.message ?? "Offer sent to the student");
      setAcceptTarget(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setAccepting(false);
    }
  };

  const columns: Column<Application>[] = [
    {
      header: "Student",
      cell: (row) => (
        <div className="min-w-36">
          <p className="font-medium">{row.student?.user?.name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground">
            {[row.student?.major, row.student?.year && `Year ${row.student.year}`]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Internship",
      cell: (row) => row.internship?.title ?? "—",
    },
    {
      header: "Applied",
      cell: (row) => formatDate(row.applied_at),
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Offer",
      cell: (row) => {
        if (!row.offered_at) return <span className="text-sm text-muted-foreground">—</span>;
        if (row.responded_at) {
          return (
            <span className="text-sm text-muted-foreground">
              Replied {formatDate(row.responded_at)}
            </span>
          );
        }
        return (
          <span className="text-sm">
            <span className="font-medium text-slate-800">{formatDate(row.offered_at)}</span>
            {row.offer_deadline && (
              <span
                className={
                  row.offer_pending
                    ? "block text-xs text-muted-foreground"
                    : "block text-xs font-medium text-rose-600"
                }
              >
                {row.offer_pending
                  ? `Reply by ${formatDate(row.offer_deadline)}`
                  : "Deadline passed"}
              </span>
            )}
          </span>
        );
      },
    },
    {
      header: "CV",
      cell: (row) => {
        const url = fileUrl(row.cv ?? row.student?.cv);
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View CV <ExternalLink className="size-3.5" />
          </a>
        );
      },
    },
    {
      header: "Actions",
      cell: (row) => {
        if (row.status !== "pending" && row.status !== "reviewing") {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              size="xs"
              variant="outline"
              disabled={actionId === row.id}
              onClick={() => handleReview(row)}
            >
              Review
            </Button>
            <Button
              size="xs"
              disabled={actionId === row.id}
              onClick={() => setAcceptTarget(row)}
            >
              Send offer
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={actionId === row.id}
              onClick={() => handleReject(row)}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-sm text-muted-foreground">
          Review and decide on student applications for your internship positions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select
            value={status}
            onValueChange={(next) => {
              setLoading(true);
              setStatus(next ?? ALL_VALUE);
              setPage(1);
            }}
            items={STATUS_ITEMS}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Internship:</span>
          <Select
            value={internshipId}
            onValueChange={(next) => {
              setLoading(true);
              setInternshipId(next ?? ALL_VALUE);
              setPage(1);
            }}
            items={internshipItems}
          >
            <SelectTrigger className="min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All internships</SelectItem>
              {internships.map((i) => (
                <SelectItem key={i.id} value={String(i.id)}>
                  {i.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        rowKey={(row) => row.id}
        emptyTitle="No applications found"
        emptyDescription="Try adjusting the filters, or publish an internship to attract applicants."
      />
      <AppPagination
        meta={meta}
        onChange={(targetPage) => {
          setLoading(true);
          setPage(targetPage);
        }}
      />

      <ConfirmDialog
        open={!!acceptTarget}
        onOpenChange={(open) => !open && setAcceptTarget(null)}
        title="Send this offer?"
        description={`The student has 7 days to accept or decline from their portal. Only when they accept is an internship assignment created for you, the supervisor office and the student to track. Offer deadline for ${
          acceptTarget?.student?.user?.name ?? "this student"
        }: "${acceptTarget?.internship?.title ?? "this internship"}".`}
        confirmLabel="Send offer"
        loading={accepting}
        onConfirm={confirmAccept}
      />
    </div>
  );
}
