import Link from "next/link";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { Internship } from "@/types";

/** True when the application deadline has already passed. */
export function isPastDeadline(deadline?: string | null): boolean {
  if (!deadline) return false;
  const time = new Date(deadline).getTime();
  return Number.isFinite(time) ? time < Date.now() : false;
}

function deadlineChip(deadline?: string | null) {
  if (!deadline) return null;
  const time = new Date(deadline).getTime();
  if (!Number.isFinite(time)) return null;
  const days = Math.ceil((time - Date.now()) / 86_400_000);
  if (days < 0)
    return "bg-status-rejected-bg text-status-rejected-text";
  if (days <= 7)
    return "bg-status-revision-bg text-status-revision-text";
  return "bg-status-accepted-bg text-status-accepted-text";
}

function deadlineLabel(deadline?: string | null) {
  if (!deadline) return null;
  const time = new Date(deadline).getTime();
  if (!Number.isFinite(time)) return null;
  const days = Math.ceil((time - Date.now()) / 86_400_000);
  if (days < 0) return "Closed";
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

export function InternshipCard({ internship }: { internship: Internship }) {
  const closed = isPastDeadline(internship.application_deadline);
  const company = internship.company?.company_name ?? "Company";
  const initials = company
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <Card className="group flex h-full flex-col border-slate-200/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="gap-0">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 ring-4 ring-blue-50/60">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground">{company}</p>
            <h3 className="mt-0.5 line-clamp-2 text-base font-bold leading-snug tracking-tight text-slate-900">
              {internship.title}
            </h3>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
          >
            {internship.category}
          </Badge>
          {internship.location && (
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600"
            >
              {internship.location}
            </Badge>
          )}
          {deadlineChip(internship.application_deadline) && (
            <span
              className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${deadlineChip(
                internship.application_deadline,
              )}`}
            >
              {deadlineLabel(internship.application_deadline)}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{internship.location}</span>
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4 shrink-0" />
          {internship.positions} position{internship.positions === 1 ? "" : "s"}
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          {formatDate(internship.start_date)} &ndash; {formatDate(internship.end_date)}
        </p>
        <p
          className={`flex items-center gap-2 ${
            closed ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          <Clock className="size-4 shrink-0" />
          Deadline: {formatDate(internship.application_deadline)}
        </p>
      </CardContent>

      <CardFooter>
        <Link
          href={`/student/internships/${internship.id}`}
          className={buttonVariants({
            size: "sm",
            className: "w-full rounded-full bg-primary font-semibold hover:bg-primary-hover",
          })}
        >
          View Details
        </Link>
      </CardFooter>
    </Card>
  );
}
