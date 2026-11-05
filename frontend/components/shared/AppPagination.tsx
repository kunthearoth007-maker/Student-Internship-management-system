"use client";

import { Button } from "@/components/ui/button";
import type { PageMeta } from "@/types";

export function AppPagination({
  meta,
  onChange,
}: {
  meta?: PageMeta;
  onChange: (page: number) => void;
}) {
  if (!meta || meta.last_page <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {meta.current_page} of {meta.last_page}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full disabled:opacity-40"
          disabled={meta.current_page <= 1}
          onClick={() => onChange(meta.current_page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full disabled:opacity-40"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onChange(meta.current_page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
