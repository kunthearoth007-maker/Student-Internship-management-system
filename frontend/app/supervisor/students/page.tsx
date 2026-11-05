"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, getPage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AppPagination } from "@/components/shared/AppPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assignment, PageMeta } from "@/types";

export default function SupervisorStudentsPage() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return getPage<Assignment>("/supervisor/students", { page, per_page: 10 })
      .then((res) => {
        setRows(res.items);
        setMeta(res.meta);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load students"))
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
      <div>
        <h1 className="text-2xl font-bold">My Assigned Students</h1>
        <p className="text-sm text-muted-foreground">Students whose internships you supervise.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            emptyTitle="No students assigned"
            columns={[
              { header: "Student", cell: (r) => r.student?.user?.name ?? "—" },
              { header: "Student ID", cell: (r) => r.student?.student_id ?? "—" },
              { header: "Major", cell: (r) => r.student?.major ?? "—" },
              { header: "Company", cell: (r) => r.company?.company_name ?? "—" },
              { header: "Internship", cell: (r) => r.internship?.title ?? "—" },
              { header: "Period", cell: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}` },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </CardContent>
      </Card>
    </div>
  );
}
