"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ApiError, getPage } from "@/lib/api";
import type { PageMeta, Supervisor } from "@/types";
import { Button } from "@/components/ui/button";
import { AppPagination } from "@/components/shared/AppPagination";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchBar } from "@/components/shared/SearchBar";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { AccountActions } from "@/components/admin/AccountActions";

export default function AdminSupervisorsPage() {
  const [items, setItems] = useState<Supervisor[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(() => {
    return getPage<Supervisor>("/admin/supervisors", {
      search: search || undefined,
      page,
    })
      .then((res) => {
        setError(null);
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load supervisors."))
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

  const columns: Column<Supervisor>[] = [
    { header: "Employee ID", cell: (s) => s.employee_id ?? "—" },
    {
      header: "Name",
      cell: (s) => (
        <span className="font-medium">{s.name ?? s.user?.name ?? "—"}</span>
      ),
    },
    { header: "Email", cell: (s) => s.user?.email ?? "—" },
    { header: "Department", cell: (s) => s.department ?? "—" },
    { header: "Phone", cell: (s) => s.phone ?? "—" },
    {
      header: "Students",
      cell: (s) => (
        <span className="font-medium text-slate-800">{s.assignments_count ?? 0}</span>
      ),
    },
    {
      header: "Actions",
      cell: (s) => <AccountActions account={s.user} onDone={() => void load()} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supervisors</h1>
        <p className="text-sm text-muted-foreground">Manage supervisor accounts.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          placeholder="Search by name, email or employee ID..."
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
          title="Failed to load supervisors"
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
            emptyTitle="No supervisors found"
            emptyDescription={search ? "Try a different search term." : undefined}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultRole="supervisor"
        onCreated={() => void load()}
      />
    </div>
  );
}
