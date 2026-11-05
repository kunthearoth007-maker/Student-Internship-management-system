"use client";

import { useEffect, useState } from "react";
import { getData } from "@/lib/api";

interface PlatformStatsData {
  students: number;
  companies: number;
  internships: number;
  completion_rate: number;
}

const HERO = [
  { key: "students", label: "Registered Students" },
  { key: "companies", label: "Partner Companies" },
  { key: "internships", label: "Internship Posts" },
  { key: "completion_rate", label: "Completion Rate" },
] as const;

const COMPACT = [
  { key: "students", label: "Students" },
  { key: "companies", label: "Companies" },
  { key: "internships", label: "Internships" },
] as const;

function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStatsData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getData<PlatformStatsData>("/public/stats")
      .then((row) => active && setStats(row))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  return { stats, failed };
}

function format(key: (typeof HERO)[number]["key"], stats: PlatformStatsData | null, failed: boolean) {
  if (failed || !stats) return "—";
  const value = stats[key];
  return key === "completion_rate" ? `${value}%` : value.toLocaleString();
}

export function PlatformStats({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const { stats, failed } = usePlatformStats();
  const items = variant === "hero" ? HERO : COMPACT;

  if (failed && !stats) return null;

  const shell =
    variant === "hero"
      ? "grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-200/70 shadow-sm sm:grid-cols-4"
      : "relative grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15";
  const cell = variant === "hero" ? "bg-white px-4 py-6 text-center" : "bg-white/5 px-4 py-5 text-center backdrop-blur";
  const value =
    variant === "hero"
      ? "text-3xl font-extrabold tracking-tight text-primary"
      : "text-2xl font-extrabold";
  const label =
    variant === "hero"
      ? "mt-1 text-xs font-medium uppercase tracking-wide text-slate-500"
      : "mt-0.5 text-xs font-medium uppercase tracking-wide text-blue-100";

  return (
    <div className={shell}>
      {items.map((item) => (
        <div key={item.key} className={cell}>
          <p className={value}>
            {stats ? (
              format(item.key, stats, failed)
            ) : (
              <span className="inline-block h-7 w-14 animate-pulse rounded bg-current/10" />
            )}
          </p>
          <p className={label}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}
