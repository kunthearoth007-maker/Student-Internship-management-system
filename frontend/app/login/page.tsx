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
import { AuthShell, AuthTabs } from "@/components/layout/AuthShell";
import { ApiError } from "@/lib/api";
import { ROLE_HOME, useAuth } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  { role: "Student", email: "student@rupp.edu.kh" },
  { role: "Company", email: "abc@tech.kh" },
  { role: "Supervisor", email: "lim@rupp.edu.kh" },
  { role: "Admin", email: "admin@rupp.edu.kh" },
];

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      router.push(searchParams.get("next") ?? ROLE_HOME[user.role]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

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

      <AuthTabs active="login" />

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to your Student Internship Management account.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              required
              placeholder="student@rupp.edu.kh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl bg-white pr-11 shadow-sm focus-visible:ring-2 focus-visible:ring-ring/40"
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
        </div>
        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold shadow-md shadow-blue-600/20 hover:bg-primary-hover"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Demo accounts · password: password
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword("password");
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-blue-50/60"
            >
              <p className="text-xs font-semibold text-slate-900">{d.role}</p>
              <p className="truncate text-[11px] text-muted-foreground">{d.email}</p>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Register
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
