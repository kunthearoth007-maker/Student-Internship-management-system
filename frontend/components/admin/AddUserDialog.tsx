"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError, sendData } from "@/lib/api";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "student", label: "Student" },
  { value: "company", label: "Company" },
  { value: "supervisor", label: "Supervisor" },
];

export function AddUserDialog({
  open,
  onOpenChange,
  defaultRole,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole: Role;
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [companyName, setCompanyName] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole(defaultRole);
    setCompanyName("");
    setErrors({});
  };

  const fieldError = (field: string) => errors[field]?.[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Name, email and password are required.");
      return;
    }
    if (role === "company" && !companyName.trim()) {
      toast.error("Company name is required for the Company role.");
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const payload: Record<string, string> = { name: name.trim(), email: email.trim(), password, role };
      if (role === "company") payload.company_name = companyName.trim();
      await sendData("post", "/admin/users", payload);
      toast.success("User created.");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError("Failed to create user.");
      setErrors(apiError.errors ?? {});
      toast.error(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Create a new account with the chosen role.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-user-name">Name</Label>
            <Input
              id="admin-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
            {fieldError("name") && (
              <p className="text-xs text-destructive">{fieldError("name")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-email">Email</Label>
            <Input
              id="admin-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
            {fieldError("email") && (
              <p className="text-xs text-destructive">{fieldError("email")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-password">Password</Label>
            <Input
              id="admin-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
            {fieldError("password") && (
              <p className="text-xs text-destructive">{fieldError("password")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              items={Object.fromEntries(ROLE_OPTIONS.map((option) => [option.value, option.label]))}
              onValueChange={(value) => setRole(value as Role)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("role") && (
              <p className="text-xs text-destructive">{fieldError("role")}</p>
            )}
          </div>
          {role === "company" && (
            <div className="space-y-2">
              <Label htmlFor="admin-user-company">Company name</Label>
              <Input
                id="admin-user-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company Ltd."
              />
              {fieldError("company_name") && (
                <p className="text-xs text-destructive">{fieldError("company_name")}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
