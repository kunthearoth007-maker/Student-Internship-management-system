export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** API returns storage paths like /storage/cvs/x.pdf */
export function fileUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8000";
  return path.startsWith("http") ? path : `${base}${path}`;
}
