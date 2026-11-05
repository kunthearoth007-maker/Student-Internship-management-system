import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Button
          className="mt-2 rounded-full bg-primary px-5 hover:bg-primary-hover"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
