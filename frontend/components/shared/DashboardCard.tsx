import { Card, CardContent } from "@/components/ui/card";

const TONES = {
  blue: { chip: "bg-blue-50 text-blue-700", ring: "ring-blue-100" },
  sky: { chip: "bg-sky-50 text-sky-600", ring: "ring-sky-100" },
  violet: { chip: "bg-violet-50 text-violet-700", ring: "ring-violet-100" },
  amber: { chip: "bg-amber-50 text-amber-600", ring: "ring-amber-100" },
  green: { chip: "bg-green-50 text-green-700", ring: "ring-green-100" },
  rose: { chip: "bg-rose-50 text-rose-600", ring: "ring-rose-100" },
  slate: { chip: "bg-slate-100 text-slate-600", ring: "ring-slate-200" },
} as const;

export type DashboardCardTone = keyof typeof TONES;

export function DashboardCard({
  title,
  value,
  icon,
  href,
  tone = "blue",
  sub,
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  href?: string;
  tone?: DashboardCardTone;
  sub?: string;
}) {
  const t = TONES[tone];

  const card = (
    <Card
      className={`overflow-hidden border-slate-200/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        href ? "cursor-pointer" : ""
      }`}
    >
      <CardContent className="pt-5">
        {icon && (
          <div
            className={`mb-3 inline-flex size-10 items-center justify-center rounded-xl ${t.chip} ring-4 ${t.ring}`}
          >
            <span className="[&>svg]:size-5">{icon}</span>
          </div>
        )}
        <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{title}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground/80">{sub}</p>}
      </CardContent>
    </Card>
  );

  return card;
}
