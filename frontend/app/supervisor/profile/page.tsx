"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, getData, sendData } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { Department, User } from "@/types";

const NOT_SET = "not_set";

export default function SupervisorProfilePage() {
  const { user, initializing, fetchMe } = useAuth();

  useEffect(() => {
    if (initializing || !user) void fetchMe();
  }, [initializing, user, fetchMe]);

  if (!user) return <LoadingSpinner label="Loading profile..." />;

  return <SupervisorProfileForm key={user.id} user={user} />;
}

function SupervisorProfileForm({ user }: { user: User }) {
  const { setUser } = useAuth();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [departmentId, setDepartmentId] = useState(
    user.supervisor?.department_id ? String(user.supervisor.department_id) : NOT_SET,
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [phone, setPhone] = useState(user.supervisor?.phone ?? "");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getData<Department[]>("/departments", { active_only: 1 })
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const res = await sendData<{ data: typeof user }>("put", "/auth/profile", { name, email });
      if (res?.data) setUser(res.data);
      toast.success("Account updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSavingAccount(false);
    }
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      const res = await sendData<{ data: unknown }>("put", "/supervisor/profile", {
        department_id: departmentId === NOT_SET ? null : Number(departmentId),
        phone,
      });
      if (res && "data" in res) {
        await useAuth.getState().fetchMe();
      }
      toast.success("Supervisor details updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await sendData("put", "/auth/password", {
        current_password: current,
        password,
        password_confirmation: confirm,
      });
      setCurrent("");
      setPassword("");
      setConfirm("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Password change failed");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          {user.supervisor?.employee_id ? `Employee ID: ${user.supervisor.employee_id}` : "Supervisor account settings"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your name and login email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" disabled={savingAccount}>{savingAccount ? "Saving..." : "Save"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supervisor Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveDetails} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={departmentId}
                items={Object.fromEntries([
                  [NOT_SET, "Not set"],
                  ...departments.map((department) => [
                    String(department.id),
                    department.code
                      ? `${department.name} (${department.code})`
                      : department.name,
                  ]),
                ])}
                onValueChange={(value) => setDepartmentId(value ?? NOT_SET)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_SET}>Not set</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                      {department.code ? ` (${department.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Departments are managed by the internship office.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" disabled={savingDetails}>{savingDetails ? "Saving..." : "Save"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={savingPassword}>{savingPassword ? "Saving..." : "Change password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
