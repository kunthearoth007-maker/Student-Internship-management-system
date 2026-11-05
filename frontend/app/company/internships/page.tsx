"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ApiError, getPage, sendData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { AppPagination } from "@/components/shared/AppPagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InternshipFormDialog,
  type InternshipPayload,
} from "@/components/company/InternshipFormDialog";
import type { Internship, PageMeta } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  remote: "Remote",
  on_site: "On-site",
};

export default function CompanyInternshipsPage() {
  const [items, setItems] = useState<Internship[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Internship | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Internship | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback((targetPage: number) => {
    return getPage<Internship>("/company/internships", { page: targetPage })
      .then((res) => {
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Failed to load internships");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const goToPage = (targetPage: number) => {
    setLoading(true);
    setPage(targetPage);
  };

  const refresh = () => {
    setLoading(true);
    load(page);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (internship: Internship) => {
    setEditing(internship);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: InternshipPayload) => {
    if (editing) {
      await sendData("put", `/company/internships/${editing.id}`, values);
      toast.success("Internship updated. It is pending admin approval again.");
    } else {
      await sendData("post", "/company/internships", values);
      toast.success("Internship created. It will need admin approval before publishing.");
    }
    setDialogOpen(false);
    setEditing(null);
    refresh();
  };

  const togglePublish = async (internship: Internship) => {
    setActionId(internship.id);
    try {
      const endpoint = internship.is_published
        ? `/company/internships/${internship.id}/unpublish`
        : `/company/internships/${internship.id}/publish`;
      await sendData("put", endpoint);
      toast.success(internship.is_published ? "Internship unpublished" : "Internship published");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sendData("delete", `/company/internships/${deleteTarget.id}`);
      toast.success("Internship deleted");
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete internship");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Internship>[] = [
    {
      header: "Title",
      cell: (row) => (
        <div className="min-w-40">
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.category} · {TYPE_LABELS[row.internship_type] ?? row.internship_type}
          </p>
        </div>
      ),
    },
    {
      header: "Location",
      cell: (row) => row.location || "—",
    },
    {
      header: "Positions",
      cell: (row) => row.positions,
    },
    {
      header: "Period",
      cell: (row) => (
        <div className="whitespace-nowrap text-sm">
          <p className="text-xs text-muted-foreground">{row.period ?? "No academic period"}</p>
          <p>{formatDate(row.start_date)} → {formatDate(row.end_date)}</p>
          <p className="text-xs text-muted-foreground">
            Deadline: {formatDate(row.application_deadline)}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={row.approval_status} />
          <Badge variant={row.is_published ? "default" : "secondary"}>
            {row.is_published ? "Published" : "Draft"}
          </Badge>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button size="xs" variant="outline" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={actionId === row.id}
            onClick={() => togglePublish(row)}
          >
            {actionId === row.id ? "..." : row.is_published ? "Unpublish" : "Publish"}
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Internships</h1>
          <p className="text-sm text-muted-foreground">
            Manage your internship postings. New or edited postings require admin approval.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Create Internship
        </Button>
      </div>

      {!loading && items.length === 0 ? (
        <EmptyState
          title="No internships yet"
          description="Create your first internship posting to start receiving applications."
          action={{ label: "Create Internship", onClick: openCreate }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            rowKey={(row) => row.id}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}

      <InternshipFormDialog
        key={`${editing?.id ?? "new"}-${dialogOpen}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        internship={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete internship?"
        description={`"${deleteTarget?.title ?? ""}" and its applications will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
