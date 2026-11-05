"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { ApiError, getData, sendData } from "@/lib/api";
import { fileUrl, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Company } from "@/types";

interface DashboardProfile {
  company: Company;
}

interface ProfileForm {
  company_name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
}

function toForm(company?: Company | null): ProfileForm {
  return {
    company_name: company?.company_name ?? "",
    email: company?.email ?? "",
    phone: company?.phone ?? "",
    address: company?.address ?? "",
    website: company?.website ?? "",
    description: company?.description ?? "",
  };
}

export default function CompanyProfilePage() {
  const { user, setUser, fetchMe } = useAuth();
  const [company, setCompany] = useState<Company | null>(user?.company ?? null);
  const [form, setForm] = useState<ProfileForm>(() => toForm(user?.company ?? null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getData<DashboardProfile>("/company/dashboard")
      .then((res) => {
        if (cancelled) return;
        setCompany(res.company);
        setForm(toForm(res.company));
      })
      .catch((err) => {
        // fall back to the company already attached to the auth user
        if (!cancelled && user?.company) {
          setCompany(user.company);
          setForm(toForm(user.company));
        }
        if (err instanceof ApiError) toast.error(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      setErrors({ company_name: "Company name is required." });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("company_name", form.company_name);
      payload.append("email", form.email);
      payload.append("phone", form.phone);
      payload.append("address", form.address);
      payload.append("website", form.website);
      payload.append("description", form.description);
      if (logoFile) payload.append("logo", logoFile);

      const updated = await sendData<unknown>("put", "/company/profile", payload);
      const newCompany = (updated as { data?: Company }).data ?? (updated as Company);
      toast.success("Company profile updated");

      if (newCompany && typeof newCompany === "object" && "company_name" in newCompany) {
        setCompany(newCompany);
        setForm(toForm(newCompany));
        if (user) setUser({ ...user, company: newCompany });
      }
      await fetchMe();
      setLogoFile(null);
      setLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      if (err instanceof ApiError) {
        const flat: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors ?? {})) {
          flat[field] = messages[0] ?? "Invalid value";
        }
        setErrors(flat);
        toast.error(err.message);
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const requestVerification = async () => {
    setVerifying(true);
    try {
      const response = await sendData<{ message?: string }>("put", "/company/verification", form);
      toast.success(response.message ?? "Verification request submitted");
      await fetchMe();
      const fresh = await getData<DashboardProfile>("/company/dashboard");
      setCompany(fresh.company);
    } catch (err) {
      if (err instanceof ApiError) {
        const flat: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors ?? {})) {
          flat[field] = messages[0] ?? "Invalid value";
        }
        setErrors(flat);
        toast.error(err.message);
      } else {
        toast.error("Could not submit the verification request");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading company profile..." />;
  }

  const logoSrc = logoPreview ?? fileUrl(company?.logo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Profile</h1>
        <p className="text-sm text-muted-foreground">
          Keep your company information up to date so students and admins can find you.
        </p>
      </div>

      <Card
        className={
          company?.verification_status === "verified"
            ? "border-emerald-200 bg-emerald-50/50"
            : company?.verification_status === "rejected"
              ? "border-rose-200 bg-rose-50/50"
              : "border-amber-200 bg-amber-50/50"
        }
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-slate-600" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">Admin verification</p>
                <StatusBadge status={company?.verification_status ?? "unverified"} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {company?.verification_status === "verified"
                  ? `Verified ${formatDate(company.verified_at)} — your internships can be published to students.`
                  : company?.verification_status === "pending"
                    ? "An administrator is reviewing your company details."
                    : company?.verification_status === "rejected"
                      ? company.verification_note ??
                        "Your details were rejected. Update them and submit again."
                      : "Publishing internships needs an administrator to verify your company first."}
              </p>
            </div>
          </div>
          {company?.verification_status !== "verified" && (
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-primary hover:bg-primary-hover"
              disabled={verifying}
              onClick={requestVerification}
            >
              {verifying
                ? "Submitting..."
                : company?.verification_status === "pending"
                  ? "Resubmit for review"
                  : "Request verification"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Logo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="size-28 rounded-lg">
              {logoSrc && <AvatarImage src={logoSrc} alt={form.company_name} />}
              <AvatarFallback className="rounded-lg text-xl">
                {(form.company_name || "C").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoFile ? "Change image" : "Upload logo"}
            </Button>
            {logoFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {logoFile.name}
              </p>
            )}
            {errors.logo && <p className="text-xs text-destructive">{errors.logo}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Company information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="profile-company-name">Company Name</Label>
                  <Input
                    id="profile-company-name"
                    value={form.company_name}
                    onChange={(e) => setField("company_name", e.target.value)}
                  />
                  {errors.company_name && (
                    <p className="text-xs text-destructive">{errors.company_name}</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="profile-phone">Phone</Label>
                  <Input
                    id="profile-phone"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="profile-website">Website</Label>
                  <Input
                    id="profile-website"
                    type="url"
                    placeholder="https://"
                    value={form.website}
                    onChange={(e) => setField("website", e.target.value)}
                  />
                  {errors.website && (
                    <p className="text-xs text-destructive">{errors.website}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="profile-address">Address</Label>
                <Input
                  id="profile-address"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="profile-description">Description</Label>
                <Textarea
                  id="profile-description"
                  rows={5}
                  placeholder="Tell students about your company, culture and what they will learn..."
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
