"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState } from "react";

export function SearchBar({
  placeholder = "Search...",
  onSearch,
}: {
  placeholder?: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form onSubmit={submit} className="relative flex-1 max-w-md">
      <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="rounded-full bg-white pl-10 shadow-sm focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <Button
        type="submit"
        size="sm"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-primary px-3 text-xs text-primary-foreground hover:bg-primary-hover"
      >
        Search
      </Button>
    </form>
  );
}
