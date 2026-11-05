"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  Briefcase,
  Users,
  LayoutDashboard,
  UserCog,
  Search,
  FileText,
  ClipboardList,
  Star,
  LogOut,
  Building2,
  Menu,
  X,
  User as UserIcon,
  FolderKanban,
  MessageSquare,
  CalendarDays,
  CalendarCheck,
  Bell,
  CalendarRange,
  ScrollText,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ROLE_HOME, useAuth } from "@/lib/auth";
import { APP_URL } from "@/lib/api";
import type { Role } from "@/types";

const NAV: Record<Role, { href: string; label: string; icon: React.ReactNode }[]> = {
  student: [
    { href: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { href: "/student/internships", label: "Internships", icon: <Search /> },
    { href: "/student/applications", label: "Applications", icon: <ClipboardList /> },
    { href: "/student/reports", label: "Reports", icon: <FileText /> },
    { href: "/student/evaluations", label: "Evaluations", icon: <Star /> },
    { href: "/student/attendance", label: "Attendance", icon: <CalendarCheck /> },
    { href: "/student/meetings", label: "Meetings", icon: <CalendarDays /> },
    { href: "/student/messages", label: "Messages", icon: <MessageSquare /> },
    { href: "/student/notifications", label: "Notifications", icon: <Bell /> },
    { href: "/student/profile", label: "Profile", icon: <UserIcon /> },
  ],
  company: [
    { href: "/company/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { href: "/company/internships", label: "Internships", icon: <FolderKanban /> },
    { href: "/company/applications", label: "Applications", icon: <ClipboardList /> },
    { href: "/company/interns", label: "My Interns", icon: <Users /> },
    { href: "/company/reports", label: "Reports", icon: <FileText /> },
    { href: "/company/attendance", label: "Attendance", icon: <CalendarCheck /> },
    { href: "/company/evaluations", label: "Evaluations", icon: <Star /> },
    { href: "/company/meetings", label: "Meetings", icon: <CalendarDays /> },
    { href: "/company/messages", label: "Messages", icon: <MessageSquare /> },
    { href: "/company/notifications", label: "Notifications", icon: <Bell /> },
    { href: "/company/profile", label: "Company Profile", icon: <Building2 /> },
  ],
  supervisor: [
    { href: "/supervisor/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { href: "/supervisor/students", label: "My Students", icon: <Users /> },
    { href: "/supervisor/reports", label: "Reports", icon: <FileText /> },
    { href: "/supervisor/attendance", label: "Attendance", icon: <CalendarCheck /> },
    { href: "/supervisor/evaluations", label: "Evaluations", icon: <Star /> },
    { href: "/supervisor/meetings", label: "Meetings", icon: <CalendarDays /> },
    { href: "/supervisor/messages", label: "Messages", icon: <MessageSquare /> },
    { href: "/supervisor/notifications", label: "Notifications", icon: <Bell /> },
    { href: "/supervisor/profile", label: "Profile", icon: <UserIcon /> },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { href: "/admin/students", label: "Students", icon: <GraduationCap /> },
    { href: "/admin/companies", label: "Companies", icon: <Building2 /> },
    { href: "/admin/supervisors", label: "Supervisors", icon: <UserCog /> },
    { href: "/admin/internships", label: "Internships", icon: <FolderKanban /> },
    { href: "/admin/applications", label: "Applications", icon: <ClipboardList /> },
    { href: "/admin/assignments", label: "Assignments", icon: <Users /> },
    { href: "/admin/reports", label: "Reports", icon: <FileText /> },
    { href: "/admin/departments", label: "Departments", icon: <Building2 /> },
    { href: "/admin/periods", label: "Periods", icon: <CalendarRange /> },
    { href: "/admin/attendance", label: "Attendance", icon: <CalendarCheck /> },
    { href: "/admin/meetings", label: "Meetings", icon: <CalendarDays /> },
    { href: "/admin/messages", label: "Messages", icon: <MessageSquare /> },
    { href: "/admin/notifications", label: "Notifications", icon: <Bell /> },
    { href: "/admin/activity-logs", label: "Activity Logs", icon: <ScrollText /> },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  student: "Student",
  company: "Company",
  supervisor: "Supervisor",
};

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-violet-100 text-violet-700 border-transparent",
  student: "bg-blue-100 text-blue-700 border-transparent",
  company: "bg-emerald-100 text-emerald-700 border-transparent",
  supervisor: "bg-amber-100 text-amber-700 border-transparent",
};

export function DashboardLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, initializing, fetchMe, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (initializing) fetchMe();
  }, [initializing, fetchMe]);

  useEffect(() => {
    if (!initializing && user && user.role !== role) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [initializing, user, role, router]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  if (initializing || !user) return <LoadingSpinner label="Loading session..." />;

  if (user.role !== role) return <LoadingSpinner />;

  const profile = user.student?.profile_image ?? user.company?.logo ?? null;
  const initials = user.name.slice(0, 2).toUpperCase();

  const sidebarBody = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Briefcase className="size-5" />
        </div>
        <div>
          <p className="text-base font-bold leading-tight tracking-tight text-slate-900">SIMS</p>
          <p className="text-xs text-muted-foreground">RUPP Internship</p>
        </div>
      </div>

      <p className="px-5 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Menu
      </p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV[role].map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setNavOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className={`[&>svg]:size-4 ${active ? "" : "text-muted-foreground"}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {profile && <AvatarImage src={`${APP_URL}${profile}`} alt={user.name} />}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-slate-900">
              {user.name}
            </p>
            <Badge
              variant="outline"
              className={`mt-1 rounded-full px-2 py-0 text-[10px] font-medium ${ROLE_BADGE[role]}`}
            >
              {ROLE_LABEL[role]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-10 w-full justify-center gap-2 rounded-lg text-muted-foreground hover:bg-slate-200/70 hover:text-slate-900"
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            await logout();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" /> Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col self-start border-r border-slate-200/70 bg-card md:sticky md:top-0 md:flex md:h-svh">
        {sidebarBody}
      </aside>

      {/* Mobile navigation drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${navOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!navOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${
            navOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setNavOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-200/70 bg-card shadow-2xl transition-transform duration-300 ease-out ${
            navOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="size-5" />
          </button>
          {sidebarBody}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-card/90 px-4 py-3 backdrop-blur sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="-ml-1 flex size-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <p className="text-sm font-semibold text-slate-900">{ROLE_LABEL[role]} Portal</p>
            <Badge
              variant="outline"
              className={`hidden rounded-full px-2 py-0.5 text-[10px] font-medium capitalize sm:inline-flex ${ROLE_BADGE[role]}`}
            >
              {role}
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell role={role} />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Avatar className="size-9 md:hidden">
              {profile && <AvatarImage src={`${APP_URL}${profile}`} alt={user.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
