"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ApiError, getPage, sendData } from "@/lib/api";
import { fileUrl, formatDate } from "@/lib/format";
import type { Company, PageMeta } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppPagination } from "@/components/shared/AppPagination";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchBar } from "@/components/shared/SearchBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { AccountActions } from "@/components/admin/AccountActions";

const VERIFICATION_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Awaiting review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "unverified", label: "Not submitted" },
];

export default function AdminCompaniesPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [decision, setDecision] = useState<{ company: Company; action: "verify" | "reject" } | null>(
    null
  );
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    return getPage<Company>("/admin/companies", {
      search: search || undefined,
      verification_status: verificationFilter || undefined,
      page,
    })
      .then((res) => {
        setError(null);
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load companies."))
      .finally(() => setLoading(false));
  }, [search, verificationFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load();
  };

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const decide = async () => {
    if (!decision) return;
    setWorking(true);
    try {
      await sendData("put", `/admin/companies/${decision.company.id}/${decision.action}`, {
        note: note.trim() || undefined,
      });
      toast.success(
        decision.action === "verify"
          ? `${decision.company.company_name} verified — they can publish internships`
          : `${decision.company.company_name} rejected — their listings were unpublished`
      );
      setDecision(null);
      setNote("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setWorking(false);
    }
  };

  const columns: Column<Company>[] = [
    {
      header: "Logo",
      cell: (c) => (
        <Avatar className="size-9 rounded-md border">
          <AvatarImage src={fileUrl(c.logo)} alt={c.company_name} />
          <AvatarFallback>{c.company_name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      header: "Company",
      cell: (c) => <span className="font-medium">{c.company_name}</span>,
    },
    { header: "Email", cell: (c) => c.user?.email ?? c.email ?? "—" },
    { header: "Phone", cell: (c) => c.phone ?? "—" },
    {
      header: "Address",
      cell: (c) => <span className="line-clamp-1 max-w-48">{c.address ?? "—"}</span>,
    },
    {
      header: "Website",
      cell: (c) =>
        c.website ? (
          <a
            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-4"
          >
            {c.website.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          "—"
        ),
    },
    {
      header: "Description",
      cell: (c) => (
        <span className="line-clamp-2 max-w-64 text-sm text-muted-foreground">
          {c.description ?? "—"}
        </span>
      ),
    },
    {
      header: "Verification",
      cell: (c) => (
        <div className="space-y-0.5">
          <StatusBadge status={c.verification_status ?? "unverified"} />
          {c.verified_at && (
            <p className="text-xs text-muted-foreground">{formatDate(c.verified_at)}</p>
          )}
          {c.verification_note && (
            <p className="line-clamp-2 max-w-40 text-xs text-muted-foreground">
              {c.verification_note}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (c) => (
        <div className="flex flex-wrap items-center gap-1">
          {c.verification_status === "verified" ? (
            <Button
              size="xs"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setNote("");
                setDecision({ company: c, action: "reject" });
              }}
            >
              Revoke
            </Button>
          ) : (
            <Button
              size="xs"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                setNote("");
                setDecision({ company: c, action: "verify" });
              }}
            >
              Verify
            </Button>
          )}
          {c.verification_status !== "verified" && c.verification_status !== "rejected" && (
            <Button
              size="xs"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setNote("");
                setDecision({ company: c, action: "reject" });
              }}
            >
              Reject
            </Button>
          )}
          <AccountActions account={c.user} onDone={() => void load()} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">Manage company accounts.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          placeholder="Search by company name or email..."
          onSearch={(value) => {
            setSearch(value);
            setLoading(true);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter by verification status"
          value={verificationFilter}
          onChange={(e) => {
            setVerificationFilter(e.target.value);
            setLoading(true);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {VERIFICATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button className="ml-auto gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      {error ? (
        <EmptyState
          title="Failed to load companies"
          description={error}
          action={{ label: "Retry", onClick: retry }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            rowKey={(c) => c.id}
            emptyTitle="No companies found"
            emptyDescription={search ? "Try a different search term." : undefined}
          />
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultRole="company"
        onCreated={() => void load()}
      />

      <Dialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision?.action === "verify"
                ? `Verify ${decision.company.company_name}?`
                : `Reject ${decision?.company.company_name}?`}
            </DialogTitle>
            <DialogDescription>
              {decision?.action === "verify"
                ? "The company is notified and can publish internships to students."
                : "Rejecting unpublished every internship this company has posted, and the company is told what to fix."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="verification-note">Note for the company</Label>
            <Textarea
              id="verification-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                decision?.action === "verify"
                  ? "Welcome aboard — you can now publish internships."
                  : "Please add your business registration number."
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={working} onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={decision?.action === "reject" ? "destructive" : "default"}
              className="rounded-full"
              disabled={working}
              onClick={decide}
            >
              {working ? "Working..." : decision?.action === "verify" ? "Verify company" : "Reject company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
