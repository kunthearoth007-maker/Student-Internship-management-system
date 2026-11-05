"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { Briefcase, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthShell, AuthTabs } from "@/components/layout/AuthShell";
import { ApiError } from "@/lib/api";
import { ROLE_HOME, useAuth } from "@/lib/auth";
import type { Role } from "@/types";

const ROLES: { value: Role; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "company", label: "Company" },
  { value: "supervisor", label: "Supervisor" },
];

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = searchParams.get("role");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: (ROLES.some((r) => r.value === prefill) ? prefill : "student") as Role,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const user = await register(form);
      toast.success("Account created successfully");
      router.push(ROLE_HOME[user.role]);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(
          err.errors
            ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]]))
            : {},
        );
        toast.error(err.message);
      } else {
        toast.error("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] ?? errors[`${key.replace("password_confirmation", "password")}_confirmation`];

  const inputClass =
    "h-11 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <>
      <div className="mb-6 flex items-center gap-2.5 lg:hidden">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Briefcase className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-900">SIMS</p>
          <p className="text-xs text-muted-foreground">RUPP Internship</p>
        </div>
      </div>

      <AuthTabs active="register" />

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Join the RUPP internship platform — it takes a minute.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">I am a...</Label>
          <Select value={form.role} onValueChange={(v) => set("role", v ?? "student")}>
            <SelectTrigger className={`w-full ${inputClass}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
            Full name
          </Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
          {form.name.length > 255 && <p className="text-xs text-destructive">Name is too long.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass}
          />
          {fieldError("email") && <p className="text-xs text-destructive">{fieldError("email")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-slate-900"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldError("password") && (
            <p className="text-xs text-destructive">{fieldError("password")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password_confirmation" className="text-sm font-medium text-slate-700">
            Confirm password
          </Label>
          <Input
            id="password_confirmation"
            type={showPassword ? "text" : "password"}
            required
            value={form.password_confirmation}
            onChange={(e) => set("password_confirmation", e.target.value)}
            className={inputClass}
          />
          {fieldError("password_confirmation") && (
            <p className="text-xs text-destructive">{fieldError("password_confirmation")}</p>
          )}
        </div>
        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold shadow-md shadow-blue-600/20 hover:bg-primary-hover"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign In
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
