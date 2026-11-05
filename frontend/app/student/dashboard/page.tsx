"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase,
  Building,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Search,
  UserCog,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApiError, getData } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { Assignment, Student, Supervisor } from "@/types";

interface StudentDashboardData {
  student?: Student | null;
  stats?: {
    applied?: number;
    offers_pending?: number;
    accepted?: number;
    reports?: number;
    reports_pending_review?: number;
    unread_messages?: number;
  };
  attendance?: {
    days: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    hours: number;
    attendance_rate: number;
  } | null;
  supervisor?: Supervisor | null;
  upcoming_meetings?: {
    id: number;
    title: string;
    scheduled_on?: string | null;
    scheduled_at?: string | null;
    location?: string | null;
    with?: string | null;
  }[];
  current_internship?: Assignment | null;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return getData<StudentDashboardData>("/student/dashboard")
      .then((rows) => setData(rows))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  const stats = data?.stats ?? {};
  const current = data?.current_internship ?? null;
  const firstName = user?.name?.split(" ")[0] ?? "Student";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          Track your internship applications, reports and evaluations in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/student/applications" className="block">
          <DashboardCard
            title="Applied"
            value={stats.applied ?? 0}
            icon={<ClipboardList />}
            tone="blue"
          />
        </Link>
        <Link href="/student/applications" className="block">
          <DashboardCard
            title="Offers to answer"
            value={stats.offers_pending ?? 0}
            icon={<Mail />}
            tone={stats.offers_pending ? "rose" : "slate"}
            sub={stats.offers_pending ? "Reply before the deadline" : "Nothing waiting"}
          />
        </Link>
        <Link href="/student/applications" className="block">
          <DashboardCard
            title="Accepted"
            value={stats.accepted ?? 0}
            icon={<Briefcase />}
            tone="green"
          />
        </Link>
        <Link href="/student/reports" className="block">
          <DashboardCard title="Reports" value={stats.reports ?? 0} icon={<FileText />} tone="amber" />
        </Link>
        <Link href="/student/reports" className="block">
          <DashboardCard
            title="Awaiting review"
            value={stats.reports_pending_review ?? 0}
            icon={<FileText />}
            tone={stats.reports_pending_review ? "violet" : "slate"}
          />
        </Link>
        <Link href="/student/messages" className="block">
          <DashboardCard
            title="Unread messages"
            value={stats.unread_messages ?? 0}
            icon={<MessageSquare />}
            tone="sky"
          />
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Current Internship</h2>
        {current ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle>{current.internship?.title ?? "Internship placement"}</CardTitle>
                  <CardDescription>
                    {current.company?.company_name ?? "Company"}
                  </CardDescription>
                </div>
                <StatusBadge status={current.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Building className="size-4 shrink-0" />
                {current.company?.company_name ?? "—"}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {current.internship?.location ?? "—"}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <UserCog className="size-4 shrink-0" />
                {current.supervisor?.name ?? current.supervisor?.user?.name ?? "No supervisor assigned"}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" />
                {formatDate(current.start_date)} &ndash; {formatDate(current.end_date)}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <EmptyState
              title="No active internship"
              description="Browse approved opportunities and submit your first application."
            />
            <Link href="/student/internships" className={buttonVariants({ size: "sm" })}>
              <Search /> Find internships
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Your supervisor</CardTitle>
            <CardDescription>
              Assigned by the internship office at RUPP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.supervisor ? (
              <>
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <UserCog className="size-4 text-muted-foreground" />
                  {data.supervisor.user?.name ?? data.supervisor.name ?? "Supervisor"}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{data.supervisor.user?.email ?? "—"}</span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Building className="size-4 shrink-0" />
                  {data.supervisor.department ?? "Department not set"}
                </p>
                <Link
                  href="/student/messages"
                  className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-2 rounded-full"}
                >
                  <MessageSquare /> Message them
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">
                No supervisor assigned yet. You will be notified as soon as the office assigns one.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Recorded by your supervisor and company.</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.attendance ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Days tracked" value={data.attendance.days} />
                <Metric label="Attendance rate" value={`${data.attendance.attendance_rate}%`} />
                <Metric label="Present" value={data.attendance.present} />
                <Metric label="Late" value={data.attendance.late} />
                <Metric label="Absent" value={data.attendance.absent} />
                <Metric label="Hours" value={data.attendance.hours} />
                <Link
                  href="/student/attendance"
                  className={buttonVariants({ variant: "outline", size: "sm" }) + " col-span-2 mt-1 rounded-full"}
                >
                  <CalendarCheck /> See the full log
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No attendance has been recorded for your internship yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming meetings</CardTitle>
            <CardDescription>Check-ins with your team.</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.upcoming_meetings && data.upcoming_meetings.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming_meetings.map((meeting) => (
                  <div key={meeting.id} className="rounded-lg border border-slate-200/80 p-3">
                    <p className="text-sm font-semibold text-slate-900">{meeting.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {formatDate(meeting.scheduled_on)} {meeting.scheduled_at?.slice(0, 5)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {meeting.with ?? "Host"} · {meeting.location || "Location TBC"}
                    </p>
                  </div>
                ))}
                <Link
                  href="/student/meetings"
                  className={buttonVariants({ variant: "outline", size: "sm" }) + " rounded-full"}
                >
                  All meetings
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No meetings on the calendar.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
