export function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-primary/70 border-t-transparent" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
