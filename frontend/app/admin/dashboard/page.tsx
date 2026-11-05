"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  UserCog,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError, getData } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface DashboardData {
  stats: {
    total_students: number;
    total_companies: number;
    total_supervisors: number;
    total_internships: number;
    total_applications: number;
    accepted_applications: number;
    active_internships: number;
    completed_internships: number;
  };
  reports: {
    submitted: number;
    approved: number;
    revision_required: number;
  };
  pending_internship_approvals: number;
  charts: {
    applications_by_month: { month: string; total: number; accepted?: number | null }[];
    internships_by_category: { category: string; total: number }[];
    students_by_major: { major: string; total: number }[];
    application_status: { status: string; total: number }[];
  };
}

const CATEGORY_COLORS = ["#1d4ed8", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#64748b", "#3b82f6"];

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)",
  fontSize: 12,
  padding: "8px 12px",
};

function formatMonth(ym: string) {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString("en-US", { month: "short" });
}

function ChartCard({
  title,
  subtitle,
  pill,
  isEmpty,
  delay = 0,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  pill?: string;
  isEmpty: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`animate-fade-up border-slate-200/70 shadow-sm ${className ?? ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-bold tracking-tight">{title}</CardTitle>
          {subtitle && <p className="text-sm font-normal text-muted-foreground">{subtitle}</p>}
        </div>
        {pill && (
          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {pill}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState title="No data yet" description="Chart will appear once there is data." />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return getData<DashboardData>("/admin/dashboard")
      .then((rows) => {
        setError(null);
        setData(rows);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load();
  };

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  if (error || !data) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={error ?? "Unknown error."}
        action={{ label: "Retry", onClick: retry }}
      />
    );
  }

  const { stats, reports, pending_internship_approvals, charts } = data;

  const monthly = charts.applications_by_month.map((m) => ({
    month: formatMonth(m.month),
    total: Number(m.total),
    accepted: Number(m.accepted ?? 0),
  }));
  const monthRange =
    charts.applications_by_month.length > 0
      ? `${formatMonth(charts.applications_by_month[0].month)} – ${formatMonth(
          charts.applications_by_month[charts.applications_by_month.length - 1].month,
        )} ${charts.applications_by_month[charts.applications_by_month.length - 1].month.slice(0, 4)}`
      : undefined;
  const byCategory = charts.internships_by_category.map((c) => ({ ...c, total: Number(c.total) }));
  const byMajor = charts.students_by_major.map((s) => ({ ...s, total: Number(s.total) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of students, companies, internships and activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardCard title="Total Students" value={stats.total_students} icon={<GraduationCap />} tone="blue" />
        <DashboardCard title="Total Companies" value={stats.total_companies} icon={<Building2 />} tone="sky" />
        <DashboardCard title="Total Supervisors" value={stats.total_supervisors} icon={<UserCog />} tone="violet" />
        <DashboardCard title="Total Internships" value={stats.total_internships} icon={<FolderKanban />} tone="amber" />
        <DashboardCard title="Total Applications" value={stats.total_applications} icon={<ClipboardList />} tone="green" />
        <DashboardCard title="Accepted Applications" value={stats.accepted_applications} icon={<Users />} tone="rose" />
        <DashboardCard title="Active Internships" value={stats.active_internships} icon={<FolderKanban />} tone="blue" />
        <DashboardCard title="Completed Internships" value={stats.completed_internships} icon={<FolderKanban />} tone="sky" />
        <DashboardCard title="Pending Internship Approvals" value={pending_internship_approvals} icon={<ClipboardList />} tone="violet" />
      </div>

      <Card className="animate-fade-up border-slate-200/70 shadow-sm" style={{ animationDelay: "100ms" }}>
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight">Reports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="text-xl font-bold">{reports.submitted}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-xl font-bold">{reports.approved}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Revision Required</p>
            <p className="text-xl font-bold">{reports.revision_required}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Applications by Month"
          subtitle="Applications submitted vs. accepted"
          pill={monthRange}
          isEmpty={monthly.length === 0}
          delay={150}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly} barGap={6} barCategoryGap="28%">
              <defs>
                <linearGradient id="gradApplications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
                <linearGradient id="gradAccepted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#a5e3fb" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#64748b" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={36} stroke="#64748b" allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(29, 78, 216, 0.05)" }} />
              <Legend iconType="circle" iconSize={8} verticalAlign="bottom" align="left" />
              <Bar
                dataKey="total"
                name="Applications"
                fill="url(#gradApplications)"
                radius={[6, 6, 0, 0]}
                maxBarSize={18}
                animationDuration={900}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="accepted"
                name="Accepted"
                fill="url(#gradAccepted)"
                radius={[6, 6, 0, 0]}
                maxBarSize={18}
                animationBegin={200}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Internships by Category"
          subtitle="Distribution across sectors"
          isEmpty={byCategory.length === 0}
          delay={250}
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={95}
                paddingAngle={3}
                cornerRadius={6}
                stroke="#fff"
                strokeWidth={2}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {byCategory.map((entry, index) => (
                  <Cell key={entry.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-1.5">
            {byCategory.map((entry, index) => (
              <li key={entry.category} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                />
                <span className="flex-1 truncate text-slate-600">{entry.category}</span>
                <span className="font-semibold text-slate-900">{entry.total}</span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title="Students by Major"
          subtitle="Enrollment distribution across faculties"
          isEmpty={byMajor.length === 0}
          delay={350}
          className="lg:col-span-3"
        >
          <ResponsiveContainer width="100%" height={Math.max(220, byMajor.length * 46)}>
            <BarChart data={byMajor} layout="vertical" barCategoryGap="30%">
              <defs>
                <linearGradient id="gradMajor" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} stroke="#64748b" allowDecimals={false} />
              <YAxis
                dataKey="major"
                type="category"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={100}
                stroke="#64748b"
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(29, 78, 216, 0.05)" }} />
              <Bar
                dataKey="total"
                name="Students"
                fill="url(#gradMajor)"
                radius={[0, 8, 8, 0]}
                maxBarSize={16}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Application Status"
          subtitle="Where applications stand today"
          isEmpty={charts.application_status.length === 0}
          delay={450}
          className="lg:col-span-3"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ResponsiveContainer width="100%" height={220} className="sm:max-w-[45%]">
              <PieChart>
                <Pie
                  data={charts.application_status}
                  dataKey="total"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="#fff"
                  strokeWidth={2}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {charts.application_status.map((entry, index) => (
                    <Cell key={entry.status} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:gap-2.5">
              {charts.application_status.map((entry) => (
                <span key={entry.status} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StatusBadge status={entry.status} />
                  <span className="font-semibold text-slate-900">{entry.total}</span>
                </span>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
