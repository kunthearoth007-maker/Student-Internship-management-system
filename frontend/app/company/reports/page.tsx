"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError, getPage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AppPagination } from "@/components/shared/AppPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PageMeta, Report } from "@/types";

const STATUS_ITEMS = {
  all: "All statuses",
  submitted: "Submitted",
  approved: "Approved",
  revision_required: "Revision Required",
};

export default function CompanyReportsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Report[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return getPage<Report>("/company/reports", {
      page,
      per_page: 10,
      ...(status !== "all" ? { status } : {}),
    })
      .then((res) => {
        setRows(res.items);
        setMeta(res.meta);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Intern Reports</h1>
          <p className="text-sm text-muted-foreground">
            Weekly and final reports submitted by your interns.
          </p>
        </div>
        <Select
          value={status}
          items={STATUS_ITEMS}
          onValueChange={(v) => {
            setStatus(v ?? "all");
            setLoading(true);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            emptyTitle="No reports yet"
            emptyDescription="Reports submitted by students interning at your company will appear here."
            onRowClick={(r) => router.push(`/company/reports/${r.id}`)}
            columns={[
              { header: "Title", cell: (r) => r.title },
              { header: "Student", cell: (r) => r.assignment?.student?.user?.name ?? "—" },
              { header: "Internship", cell: (r) => r.assignment?.internship?.title ?? "—" },
              { header: "Type", cell: (r) => r.report_type.replace(/_/g, " ") },
              { header: "Submitted", cell: (r) => formatDate(r.submitted_at) },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </CardContent>
      </Card>
    </div>
  );
}
