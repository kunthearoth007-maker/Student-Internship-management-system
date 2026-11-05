import Link from "next/link";
import { Briefcase, GraduationCap, CheckCircle2 } from "lucide-react";
import { PlatformStats } from "@/components/shared/PlatformStats";

const FEATURES = [
  "Apply to verified internships from partner companies",
  "Track applications, reports and supervisor feedback live",
  "One structured workflow from acceptance to final result",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[45%] max-w-2xl flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-sky-400/20 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Briefcase className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight">SIMS</p>
            <p className="text-xs text-blue-100">RUPP Internship</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
            Your internship,
            <br />
            from application to
            <br />
            final evaluation.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-blue-100">
            The Student Internship Management System connects Royal University of Phnom Penh
            students, partner companies, and academic supervisors in one platform.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-blue-50">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sky-300" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <PlatformStats variant="compact" />

        <p className="relative flex items-center gap-2 text-xs text-blue-200">
          <GraduationCap className="size-4" />
          Royal University of Phnom Penh
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

export function AuthTabs({ active }: { active: "login" | "register" }) {
  return (
    <div className="mb-6 grid grid-cols-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      <Link
        href="/login"
        className={`rounded-full px-4 py-2 text-center text-sm font-semibold transition-colors ${
          active === "login"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className={`rounded-full px-4 py-2 text-center text-sm font-semibold transition-colors ${
          active === "register"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Register
      </Link>
    </div>
  );
}
