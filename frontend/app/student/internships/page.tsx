"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppPagination } from "@/components/shared/AppPagination";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { SearchBar } from "@/components/shared/SearchBar";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, getPage } from "@/lib/api";
import { InternshipCard } from "@/components/student/InternshipCard";
import type { Internship, PageMeta } from "@/types";

const CAMBODIA_PROVINCES = [
  "Phnom Penh",
  "Siem Reap",
  "Battambang",
  "Kampong Cham",
  "Takeo",
  "Kandal",
];

const ALL = "all";

export default function StudentInternshipsPage() {
  const [items, setItems] = useState<Internship[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [location, setLocation] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>(CAMBODIA_PROVINCES);

  const load = useCallback(() => {
    return getPage<Internship>("/internships", {
      search: search || undefined,
      category: category === ALL ? undefined : category,
      location: location === ALL ? undefined : location,
      page,
      per_page: 9,
    })
      .then((res) => {
        setItems(res.items ?? []);
        setMeta(res.meta);
        // Accumulate every option we have seen so filters never shrink the lists.
        setCategories((prev) => mergeOptions(prev, res.items.map((i) => i.category)));
        setLocations((prev) => mergeOptions(prev, res.items.map((i) => i.location), CAMBODIA_PROVINCES));
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load internships"))
      .finally(() => setLoading(false));
  }, [search, category, location, page]);

  useEffect(() => {
    load();
  }, [load]);

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const categoryItems = useMemo(
    () => [{ value: ALL, label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))],
    [categories]
  );
  const locationItems = useMemo(
    () => [{ value: ALL, label: "All locations" }, ...locations.map((l) => ({ value: l, label: l }))],
    [locations]
  );

  const hasFilters = search !== "" || category !== ALL || location !== ALL;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Internship Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          Browse approved internship listings from partner companies and apply online.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBar
          placeholder="Search by title, company or location..."
          onSearch={(value) => {
            setSearch(value);
            setLoading(true);
            setPage(1);
          }}
        />
        <Select
          items={categoryItems}
          value={category}
          onValueChange={(value) => {
            setCategory(value ?? ALL);
            setLoading(true);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={locationItems}
          value={location}
          onValueChange={(value) => {
            setLocation(value ?? ALL);
            setLoading(true);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by location">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            {locationItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading internships..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No internships found"
          description={
            hasFilters
              ? "Try a different keyword, category or location."
              : "New opportunities are published regularly. Check back soon."
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
          <AppPagination meta={meta} onChange={goToPage} />
        </>
      )}
    </div>
  );
}

function mergeOptions(current: string[], incoming: string[], base: string[] = []): string[] {
  const set = new Set([...base, ...current, ...incoming.filter(Boolean)]);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
