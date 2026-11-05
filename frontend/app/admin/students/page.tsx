"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Eye } from "lucide-react";
import { ApiError, getPage } from "@/lib/api";
import { fileUrl, formatDate } from "@/lib/format";
import type { PageMeta, Student } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AppPagination } from "@/components/shared/AppPagination";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchBar } from "@/components/shared/SearchBar";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { AccountActions } from "@/components/admin/AccountActions";

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value || "—"}</span>
    </div>
  );
}

export default function AdminStudentsPage() {
  const [items, setItems] = useState<Student[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(() => {
    return getPage<Student>("/admin/students", {
      search: search || undefined,
      page,
    })
      .then((res) => {
        setError(null);
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load students."))
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load();
  };

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const columns: Column<Student>[] = [
    {
      header: "Name",
      cell: (s) => <span className="font-medium">{s.user?.name ?? "—"}</span>,
    },
    { header: "Email", cell: (s) => s.user?.email ?? "—" },
    { header: "Student ID", cell: (s) => s.student_id },
    { header: "Major", cell: (s) => s.major ?? "—" },
    { header: "Department", cell: (s) => s.department ?? "—" },
    { header: "Year", cell: (s) => s.year ?? "—" },
    { header: "Phone", cell: (s) => s.phone ?? "—" },
    {
      header: "Actions",
      cell: (s) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelected(s)}
            className="gap-1"
          >
            <Eye className="size-4" />
            View
          </Button>
          <AccountActions account={s.user} onDone={() => void load()} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">Manage student accounts and profiles.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          placeholder="Search by name, email or student ID..."
          onSearch={(value) => {
            setLoading(true);
            setSearch(value);
            setPage(1);
          }}
        />
        <Button className="ml-auto gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      {error ? (
        <EmptyState
          title="Failed to load students"
          description={error}
          action={{ label: "Retry", onClick: retry }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            rowKey={(s) => s.id}
            emptyTitle="No students found"
            emptyDescription={search ? "Try a different search term." : undefined}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.user?.name ?? "Student details"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              <DetailRow label="Email" value={selected.user?.email} />
              <DetailRow label="Student ID" value={selected.student_id} />
              <DetailRow label="Major" value={selected.major} />
              <DetailRow label="Year" value={selected.year} />
              <DetailRow label="Phone" value={selected.phone} />
              <DetailRow label="Gender" value={selected.gender} />
              <DetailRow label="Date of birth" value={formatDate(selected.date_of_birth)} />
              <DetailRow label="Address" value={selected.address} />
              <Separator className="my-3" />
              <p className="text-sm text-muted-foreground">Bio</p>
              <p className="text-sm">{selected.bio || "—"}</p>
              <Separator className="my-3" />
              <p className="mb-1 text-sm text-muted-foreground">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.skills.length > 0 ? (
                  selected.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm">—</span>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">CV</p>
                {fileUrl(selected.cv) ? (
                  <a
                    href={fileUrl(selected.cv)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    View CV
                  </a>
                ) : (
                  <span className="text-sm">—</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultRole="student"
        onCreated={() => void load()}
      />
    </div>
  );
}
