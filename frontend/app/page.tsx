import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Search,
  Star,
  UserCog,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CopyrightYear } from "@/components/shared/CopyrightYear";
import { PlatformStats } from "@/components/shared/PlatformStats";

const WORKFLOW = [
  {
    icon: <Search />,
    chip: "bg-blue-50 text-blue-600",
    title: "Discover & Apply",
    text: "Browse verified internship posts from partner companies and apply with your profile and CV.",
  },
  {
    icon: <CheckCircle2 />,
    chip: "bg-emerald-50 text-emerald-600",
    title: "Company Review",
    text: "Companies review applications, interview candidates, and accept the best fit for each role.",
  },
  {
    icon: <UserCog />,
    chip: "bg-violet-50 text-violet-600",
    title: "Supervisor Assigned",
    text: "Administrators assign an academic supervisor to every accepted intern to guide the placement.",
  },
  {
    icon: <FileText />,
    chip: "bg-amber-50 text-amber-600",
    title: "Weekly Reports",
    text: "Students submit progress reports each week; supervisors review and leave structured feedback.",
  },
  {
    icon: <Star />,
    chip: "bg-rose-50 text-rose-600",
    title: "Evaluation & Result",
    text: "Companies and supervisors evaluate performance to produce the final internship result.",
  },
];

const ROLES = [
  {
    icon: <GraduationCap />,
    title: "For Students",
    text: "Find internships, track applications, and submit reports on time.",
    href: "/register?role=student",
    card: "bg-blue-50/70 border-blue-100",
    chip: "bg-blue-100 text-blue-700",
  },
  {
    icon: <Building2 />,
    title: "For Companies",
    text: "Post opportunities, review candidates, and mentor the next generation.",
    href: "/register?role=company",
    card: "bg-emerald-50/70 border-emerald-100",
    chip: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: <UserCog />,
    title: "For Supervisors",
    text: "Guide assigned students, review weekly reports, and give feedback.",
    href: "/register?role=supervisor",
    card: "bg-amber-50/70 border-amber-100",
    chip: "bg-amber-100 text-amber-700",
  },
  {
    icon: <Users />,
    title: "For Administrators",
    text: "Oversee the whole program — placements, assignments, and results.",
    href: "/register?role=admin",
    card: "bg-violet-50/70 border-violet-100",
    chip: "bg-violet-100 text-violet-700",
  },
];

export const instant = false;

export default async function HomePage() {
  const store = await cookies();
  const token = store.get("sims_token")?.value;
  const role = store.get("sims_role")?.value;

  if (token && role) redirect(`/${role}/dashboard`);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Briefcase className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900">SIMS</span>
              <span className="block text-xs text-muted-foreground">RUPP Internship</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#workflow" className="transition-colors hover:text-primary">
              How It Works
            </a>
            <a href="#roles" className="transition-colors hover:text-primary">
              Roles
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "text-slate-600 hover:text-slate-900" })}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className={buttonVariants({ size: "sm", className: "rounded-full px-4 bg-primary hover:bg-primary-hover shadow-sm" })}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_-5%,rgba(29,78,216,0.10),transparent),radial-gradient(35%_35%_at_85%_20%,rgba(14,165,233,0.08),transparent)]" />
          <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pb-16 sm:pt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700">
              <GraduationCap className="size-3.5" />
              Royal University of Phnom Penh · Internship Platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Find your internship.
              <br />
              <span className="text-primary">Track it to completion.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
              SIMS connects RUPP students with partner companies — apply, get reviewed, work with an
              assigned supervisor, submit weekly reports, and receive your final evaluation in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className={buttonVariants({ size: "lg", className: "rounded-full bg-primary px-6 shadow-md shadow-blue-600/20 hover:bg-primary-hover" })}
              >
                Find Internships <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/register?role=company"
                className={buttonVariants({ size: "lg", variant: "outline", className: "rounded-full border-slate-300 bg-white px-6 shadow-sm hover:bg-slate-50" })}
              >
                Post an Internship
              </Link>
              <a
                href="#workflow"
                className={buttonVariants({ size: "lg", variant: "ghost", className: "rounded-full px-6 text-slate-600 hover:bg-slate-100 hover:text-slate-900" })}
              >
                How It Works
              </a>
            </div>
          </div>

          {/* Stats band */}
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
            <PlatformStats />
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">How It Works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              One workflow, five clear steps
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Every internship follows the same supervised path — from application to final result.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="absolute right-4 top-4 text-xs font-bold text-slate-300">
                  0{i + 1}
                </span>
                <span className={`inline-flex size-10 items-center justify-center rounded-xl [&>svg]:size-5 ${step.chip}`}>
                  {step.icon}
                </span>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-20 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Built for Everyone</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                A dedicated portal for each role
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((r) => (
                <Link
                  key={r.title}
                  href={r.href}
                  className={`group rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-md ${r.card}`}
                >
                  <span className={`inline-flex size-11 items-center justify-center rounded-xl [&>svg]:size-5 ${r.chip}`}>
                    {r.icon}
                  </span>
                  <h3 className="mt-4 font-bold text-slate-900">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Get started
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-5 py-12 text-center shadow-xl shadow-blue-600/20 sm:px-8 sm:py-14">
            <ClipboardList className="mx-auto size-10 text-white/80" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to start your internship journey?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-blue-100">
              Create your account in minutes and join hundreds of RUPP students and partner companies
              already using SIMS.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className={buttonVariants({
                  size: "lg",
                  className: "rounded-full bg-white px-6 text-blue-700 shadow-sm hover:bg-blue-50 hover:text-blue-800",
                })}
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "rounded-full border-white/40 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white",
                })}
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/60 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Briefcase className="size-4" />
            </span>
            <span className="text-sm font-semibold text-slate-900">SIMS · RUPP</span>
          </div>
          <p className="text-sm text-slate-500">
            © <CopyrightYear /> Royal University of Phnom Penh
          </p>
        </div>
      </footer>
    </div>
  );
}
