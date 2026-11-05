import { Badge } from "@/components/ui/badge";

const STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-status-pending-bg text-status-pending-text border-transparent" },
  reviewing: { label: "Reviewing", className: "bg-status-reviewing-bg text-status-reviewing-text border-transparent" },
  submitted: { label: "Submitted", className: "bg-status-reviewing-bg text-status-reviewing-text border-transparent" },
  accepted: { label: "Accepted", className: "bg-status-accepted-bg text-status-accepted-text border-transparent" },
  approved: { label: "Approved", className: "bg-status-accepted-bg text-status-accepted-text border-transparent" },
  published: { label: "Published", className: "bg-status-accepted-bg text-status-accepted-text border-transparent" },
  active: { label: "Active", className: "bg-status-accepted-bg text-status-accepted-text border-transparent" },
  rejected: { label: "Rejected", className: "bg-status-rejected-bg text-status-rejected-text border-transparent" },
  cancelled: { label: "Cancelled", className: "bg-status-rejected-bg text-status-rejected-text border-transparent" },
  completed: { label: "Completed", className: "bg-status-completed-bg text-status-completed-text border-transparent" },
  draft: { label: "Draft", className: "bg-status-completed-bg text-status-completed-text border-transparent" },
  revision_required: { label: "Revision Required", className: "bg-status-revision-bg text-status-revision-text border-transparent" },
  scheduled: { label: "Scheduled", className: "bg-status-reviewing-bg text-status-reviewing-text border-transparent" },
  offered: { label: "Offered", className: "bg-status-reviewing-bg text-status-reviewing-text border-transparent" },
  declined: { label: "Declined", className: "bg-status-rejected-bg text-status-rejected-text border-transparent" },
  expired: { label: "Expired", className: "bg-status-completed-bg text-status-completed-text border-transparent" },
  present: { label: "Present", className: "bg-status-accepted-bg text-status-accepted-text border-transparent" },
  late: { label: "Late", className: "bg-status-revision-bg text-status-revision-text border-transparent" },
  absent: { label: "Absent", className: "bg-status-rejected-bg text-status-rejected-text border-transparent" },
  excused: { label: "Excused", className: "bg-status-completed-bg text-status-completed-text border-transparent" },
  verified: { label: "Verified", className: "bg-status-accepted-bg text-status-accepted-text border-transparent" },
  unverified: { label: "Unverified", className: "bg-status-completed-bg text-status-completed-text border-transparent" },
  suspended: { label: "Suspended", className: "bg-status-rejected-bg text-status-rejected-text border-transparent" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? {
    label: status.replace(/_/g, " "),
    className: "bg-status-completed-bg text-status-completed-text border-transparent",
  };

  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${style.className}`}>
      {style.label}
    </Badge>
  );
}
