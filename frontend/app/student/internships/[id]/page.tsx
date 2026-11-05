"use client";

import { useCallback, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Building, CalendarDays, CheckCircle2, Clock, MapPin, Send, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApiError, getData, getPage, sendData } from "@/lib/api";
import { fileUrl, formatDate } from "@/lib/format";
import { isPastDeadline } from "@/components/student/InternshipCard";
import type { Application, Internship } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  remote: "Remote",
  onsite: "On-site",
  on_site: "On-site",
  hybrid: "Hybrid",
};

function formatType(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

/** Backend stores requirements as free text: one item per line, or comma separated. */
function toList(raw?: string | null): string[] {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const single = lines[0] ?? raw;
  if (/[;,]/.test(single)) {
    return single
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [single];
}

/** Scan the student's applications (paged) for this internship. */
async function findExistingApplication(internshipId: number): Promise<Application | undefined> {
  const perPage = 50;
  let page = 1;
  let lastPage = 1;
  do {
    const res = await getPage<Application>("/student/applications", { page, per_page: perPage });
    const found = (res.items ?? []).find((item) => item.internship_id === internshipId);
    if (found) return found;
    lastPage = res.meta?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage && page <= 10);
  return undefined;
}

function InternshipDetail() {
  const params = useParams<{ id: string }>();
  const internshipId = Number(params?.id);

  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<Application | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    if (!Number.isFinite(internshipId)) {
      return Promise.resolve().then(() => setLoading(false));
    }
    return getData<Internship>(`/internships/${internshipId}`)
      .then((row) => setInternship(row))
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load internship")
      )
      .finally(() => setLoading(false))
      // A failed "already applied" lookup must never block the detail page.
      .then(() => findExistingApplication(internshipId))
      .then((application) => setExisting(application))
      .catch(() => setExisting(undefined));
  }, [internshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internship) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      const form = new FormData();
      form.append("internship_id", String(internship.id));
      form.append("cover_letter", coverLetter);
      if (cvFile) form.append("cv", cvFile);
      await sendData("post", "/student/applications", form);
      toast.success("Application submitted successfully. Status: Pending");
      setDialogOpen(false);
      setCoverLetter("");
      setCvFile(null);
      setExisting({
        id: 0,
        student_id: 0,
        internship_id: internship.id,
        status: "pending",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.message.toLowerCase();
        if (message.includes("already applied")) {
          toast.info("You have already applied for this internship.");
          void findExistingApplication(internship.id)
            .then(setExisting)
            .catch(() => undefined);
        } else {
          toast.error(err.message);
        }
        setFieldErrors(
          err.errors
            ? Object.fromEntries(Object.entries(err.errors).map(([key, value]) => [key, value[0]]))
            : {}
        );
      } else {
        toast.error("Failed to submit application");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading internship..." />;

  if (!internship) {
    return (
      <div className="space-y-4">
        <EmptyState title="Internship not found" description="It may have been removed or unpublished." />
        <Link href="/student/internships" className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" /> Back to internships
        </Link>
      </div>
    );
  }

  const closed = isPastDeadline(internship.application_deadline);
  const alreadyApplied = existing !== undefined;
  const requirements = toList(internship.requirements);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/student/internships"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to opportunities
        </Link>
        <Badge variant="outline">{internship.category}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                {internship.company?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl(internship.company.logo)}
                    alt={internship.company.company_name}
                    className="size-14 shrink-0 rounded-lg border bg-muted object-contain p-1"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Building className="size-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-xl leading-tight">{internship.title}</CardTitle>
                  <CardDescription>{internship.company?.company_name ?? "Partner company"}</CardDescription>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" /> {internship.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="size-4" /> {formatType(internship.internship_type)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-4" /> {internship.positions} position
                      {internship.positions === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-2">
                <h2 className="font-semibold">Description</h2>
                <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {(internship.description || "—")
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                </div>
              </section>

              <Separator />

              <section className="space-y-2">
                <h2 className="font-semibold">Requirements</h2>
                {requirements.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {requirements.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific requirements listed.</p>
                )}
              </section>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-4" /> Internship period
                </span>
                <span className="text-right font-medium">
                  {formatDate(internship.start_date)}
                  <br />
                  <span className="text-muted-foreground">to</span> {formatDate(internship.end_date)}
                </span>
              </div>
              <Separator />
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" /> Application deadline
                </span>
                <span className={`text-right font-medium ${closed ? "text-destructive" : ""}`}>
                  {formatDate(internship.application_deadline)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={internship.approval_status} />
              </div>

              {alreadyApplied ? (
                <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                    <CheckCircle2 className="size-4" /> Already applied
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your application is {existing?.status ?? "pending"}. Track it under Applications.
                  </p>
                  <Link
                    href="/student/applications"
                    className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
                  >
                    View my applications
                  </Link>
                </div>
              ) : closed ? (
                <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                  Applications for this internship have closed.
                </p>
              ) : (
                <Button className="w-full" onClick={() => setDialogOpen(true)}>
                  <Send /> Apply Now
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Apply for {internship.title}</DialogTitle>
              <DialogDescription>
                {internship.company?.company_name ?? "Company"} &middot; {internship.location}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="cover_letter">Cover letter</Label>
              <Textarea
                id="cover_letter"
                required
                rows={6}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Explain why you are a good fit for this internship..."
              />
              {fieldErrors.cover_letter && (
                <p className="text-xs text-destructive">{fieldErrors.cover_letter}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cv">CV (optional)</Label>
              <Input
                id="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to send the CV saved in your profile.
              </p>
              {fieldErrors.cv && <p className="text-xs text-destructive">{fieldErrors.cv}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || coverLetter.trim().length === 0}>
                {submitting ? "Submitting..." : "Submit application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentInternshipDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading internship..." />}>
      <InternshipDetail />
    </Suspense>
  );
}
