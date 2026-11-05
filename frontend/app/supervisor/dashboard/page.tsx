"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, FileText, Users } from "lucide-react";
import { ApiError, getData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { Assignment, Supervisor, User } from "@/types";

interface DashboardData {
  supervisor: Supervisor & { user?: User };
  stats: { assigned_students: number; pending_reports: number; completed: number };
  students: Assignment[];
}

export default function SupervisorDashboardPage() {
  const { user, fetchMe } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) fetchMe();
    getData<DashboardData>("/supervisor/dashboard")
      .then(setData)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [user, fetchMe]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {data.supervisor.user?.name ?? user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard title="Assigned Students" value={data.stats.assigned_students} icon={<Users />} tone="blue" />
        <DashboardCard title="Pending Reports" value={data.stats.pending_reports} icon={<FileText />} tone="amber" />
        <DashboardCard title="Completed" value={data.stats.completed} icon={<CheckCircle2 />} tone="green" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>My Students</CardTitle>
          <Link href="/supervisor/reports" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Review Reports
          </Link>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={data.students}
            rowKey={(row) => row.id}
            emptyTitle="No students assigned yet"
            emptyDescription="Assignments appear here once the admin assigns you to students."
            columns={[
              { header: "Student", cell: (r) => r.student?.user?.name ?? "—" },
              { header: "Company", cell: (r) => r.company?.company_name ?? "—" },
              { header: "Internship", cell: (r) => r.internship?.title ?? "—" },
              { header: "Period", cell: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}` },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
