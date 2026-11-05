"use client";

import { useEffect, useState } from "react";
import { Briefcase, ClipboardList, Users } from "lucide-react";
import { toast } from "sonner";
import { ApiError, getData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Application, Assignment, Company, Internship } from "@/types";

interface CompanyDashboardData {
  company: Company;
  stats: {
    internships: number;
    applications: number;
    active_interns: number;
  };
  recent_applications: Application[];
  interns: Assignment[];
}

export default function CompanyDashboardPage() {
  const [data, setData] = useState<CompanyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getData<CompanyDashboardData>("/company/dashboard")
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error("Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applicationColumns: Column<Application>[] = [
    {
      header: "Student",
      cell: (row) => (
        <span className="font-medium">{row.student?.user?.name ?? "Unknown"}</span>
      ),
    },
    {
      header: "Position",
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
  ];

  if (loading && !data) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back{data?.company.company_name ? `, ${data.company.company_name}` : ""}.
          Here is an overview of your internship program.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Internships"
          value={data?.stats.internships ?? 0}
          icon={<Briefcase />}
          tone="blue"
        />
        <DashboardCard
          title="Applications"
          value={data?.stats.applications ?? 0}
          icon={<ClipboardList />}
          tone="amber"
        />
        <DashboardCard
          title="Active Interns"
          value={data?.stats.active_interns ?? 0}
          icon={<Users />}
          tone="green"
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Applications</h2>
        <DataTable
          columns={applicationColumns}
          rows={data?.recent_applications ?? []}
          loading={loading}
          rowKey={(row) => row.id}
          emptyTitle="No applications yet"
          emptyDescription="New student applications for your internships will appear here."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Current Interns</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (data?.interns ?? []).length === 0 ? (
          <EmptyState
            title="No interns yet"
            description="Accepted applicants will show up here as your current interns."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(data?.interns ?? []).map((assignment: Assignment) => {
              const internship: Internship | undefined = assignment.internship;
              return (
                <Card key={assignment.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {assignment.student?.user?.name ?? "Unknown student"}
                    </CardTitle>
                    <p className="truncate text-sm text-muted-foreground">
                      {internship?.title ?? "—"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Period</span>
                      <span>
                        {formatDate(assignment.start_date)} – {formatDate(assignment.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Supervisor</span>
                      <span>
                        {assignment.supervisor?.name ??
                          assignment.supervisor?.user?.name ??
                          (assignment.supervisor_id ? "Assigned" : "Not assigned")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={assignment.status} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
