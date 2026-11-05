"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText, Lock, Plus, Save, Trash2, Upload, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ApiError, getData, sendData } from "@/lib/api";
import { fileUrl, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { ApiEnvelope, Department, Student, User } from "@/types";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
};

const NONE_VALUE = "none";

function toErrorMap(err: unknown): Record<string, string> {
  if (err instanceof ApiError && err.errors) {
    return Object.fromEntries(Object.entries(err.errors).map(([key, value]) => [key, value[0]]));
  }
  return {};
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function StudentProfilePage() {
  const { user, initializing, fetchMe } = useAuth();

  useEffect(() => {
    if (initializing || !user) void fetchMe();
  }, [initializing, user, fetchMe]);

  if (!user) return <LoadingSpinner label="Loading profile..." />;

  return <StudentProfileForm key={user.id} user={user} />;
}

function StudentProfileForm({ user }: { user: User }) {
  const { setUser } = useAuth();
  const student = user.student ?? null;

  const [account, setAccount] = useState({ name: user.name ?? "", email: user.email ?? "" });
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [savingAccount, setSavingAccount] = useState(false);

  const [details, setDetails] = useState({
    student_id: student?.student_id ?? "",
    phone: student?.phone ?? "",
    gender: student?.gender ?? "",
    date_of_birth: student?.date_of_birth ? student.date_of_birth.slice(0, 10) : "",
    major: student?.major ?? "",
    year: student?.year ?? "",
    address: student?.address ?? "",
    bio: student?.bio ?? "",
  });
  const storedSkills = student?.skills;
  const [skills, setSkills] = useState<string[]>(Array.isArray(storedSkills) ? storedSkills : []);
  const [skillInput, setSkillInput] = useState("");
  const [departmentId, setDepartmentId] = useState(
    student?.department_id ? String(student.department_id) : NONE_VALUE
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({});
  const [savingDetails, setSavingDetails] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [passwords, setPasswords] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const departmentItems = useMemo(
    () => [
      { value: NONE_VALUE, label: "Not assigned" },
      ...departments.map((department) => ({
        value: String(department.id),
        label: department.code ? `${department.name} (${department.code})` : department.name,
      })),
    ],
    [departments],
  );

  const departmentName = useMemo(() => {
    const match = departments.find((department) => String(department.id) === departmentId);
    return match?.name ?? student?.department ?? null;
  }, [departments, departmentId, student?.department]);

  useEffect(() => {
    let cancelled = false;
    getData<Department[]>("/departments", { active_only: 1 })
      .then((rows) => {
        if (!cancelled) setDepartments(rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = useMemo(() => user.name.slice(0, 2).toUpperCase(), [user.name]);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);

  const pickAvatar = (file: File | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    const next = file ? URL.createObjectURL(file) : null;
    previewUrl.current = next;
    setAvatarPreview(next);
    setAvatarFile(file);
  };

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const avatarSrc = avatarPreview ?? fileUrl(student?.profile_image);

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value) return;
    if (skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      toast.info("Skill already added");
      return;
    }
    setSkills((prev) => [...prev, value]);
    setSkillInput("");
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountErrors({});
    try {
      const res = await sendData<ApiEnvelope<User>>("put", "/auth/profile", {
        name: account.name,
        email: account.email,
      });
      setUser({ ...user, ...(res.data ?? { name: account.name, email: account.email }) });
      toast.success("Account updated");
    } catch (err) {
      setAccountErrors(toErrorMap(err));
      toast.error(messageOf(err, "Failed to update account"));
    } finally {
      setSavingAccount(false);
    }
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsErrors({});
    try {
      const form = new FormData();
      form.append("phone", details.phone);
      if (details.gender) form.append("gender", details.gender);
      if (details.date_of_birth) form.append("date_of_birth", details.date_of_birth);
      form.append("major", details.major);
      if (departments.length > 0) {
        form.append("department_id", departmentId === NONE_VALUE ? "" : departmentId);
      }
      form.append("year", details.year);
      form.append("address", details.address);
      form.append("bio", details.bio);
      skills.forEach((skill) => form.append("skills[]", skill));
      if (avatarFile) form.append("profile_image", avatarFile);
      if (cvFile) form.append("cv", cvFile);

      const res = await sendData<ApiEnvelope<Student>>("put", "/student/profile", form);
      const updated = res.data ?? student;
      if (updated) setUser({ ...user, student: updated });
      pickAvatar(null);
      setCvFile(null);
      toast.success("Profile updated");
    } catch (err) {
      setDetailsErrors(toErrorMap(err));
      toast.error(messageOf(err, "Failed to update profile"));
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.password !== passwords.password_confirmation) {
      setPasswordErrors({ password_confirmation: "Passwords do not match." });
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    setPasswordErrors({});
    try {
      await sendData("put", "/auth/password", {
        current_password: passwords.current_password,
        password: passwords.password,
        password_confirmation: passwords.password_confirmation,
      });
      setPasswords({ current_password: "", password: "", password_confirmation: "" });
      toast.success("Password changed");
    } catch (err) {
      setPasswordErrors(toErrorMap(err));
      toast.error(messageOf(err, "Failed to change password"));
    } finally {
      setSavingPassword(false);
    }
  };

  const error = (map: Record<string, string>, field: string) =>
    map[field] ? <p className="text-xs text-destructive">{map[field]}</p> : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Keep your account, student details and CV up to date — companies read them with every
          application.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your login name and email address.</CardDescription>
            </CardHeader>
            <form onSubmit={saveAccount}>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      required
                      value={account.name}
                      onChange={(e) => setAccount((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    {error(accountErrors, "name")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={account.email}
                      onChange={(e) => setAccount((prev) => ({ ...prev, email: e.target.value }))}
                    />
                    {error(accountErrors, "email")}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-4">
                <Button type="submit" disabled={savingAccount}>
                  <Save /> {savingAccount ? "Saving..." : "Save account"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Student details */}
          <Card>
            <CardHeader>
              <CardTitle>Student details</CardTitle>
              <CardDescription>
                Profile photo, contact information, studies and CV shared with recruiters.
              </CardDescription>
            </CardHeader>
            <form onSubmit={saveDetails}>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar className="size-16">
                    {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name} />}
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="profile_image" className="flex items-center gap-2">
                      <Upload className="size-4" /> Profile photo
                    </Label>
                    <Input
                      id="profile_image"
                      type="file"
                      accept="image/*"
                      className="w-full sm:w-72"
                      onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
                    />
                    {error(detailsErrors, "profile_image")}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="student_id">Student ID</Label>
                    <Input id="student_id" value={details.student_id} readOnly disabled />
                    <p className="text-xs text-muted-foreground">
                      Managed by the internship office.
                    </p>
                    {error(detailsErrors, "student_id")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="012 345 678"
                      value={details.phone}
                      onChange={(e) => setDetails((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                    {error(detailsErrors, "phone")}
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      items={GENDERS}
                      value={details.gender}
                      onValueChange={(value) =>
                        setDetails((prev) => ({ ...prev, gender: value ?? "" }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {error(detailsErrors, "gender")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={details.date_of_birth}
                      onChange={(e) =>
                        setDetails((prev) => ({ ...prev, date_of_birth: e.target.value }))
                      }
                    />
                    {error(detailsErrors, "date_of_birth")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="major">Major</Label>
                    <Input
                      id="major"
                      placeholder="Software Engineering"
                      value={details.major}
                      onChange={(e) => setDetails((prev) => ({ ...prev, major: e.target.value }))}
                    />
                    {error(detailsErrors, "major")}
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      items={departmentItems}
                      value={departmentId}
                      onValueChange={(value) => setDepartmentId(value ?? NONE_VALUE)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {error(detailsErrors, "department_id")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year of study</Label>
                    <Input
                      id="year"
                      placeholder="3rd year"
                      value={details.year}
                      onChange={(e) => setDetails((prev) => ({ ...prev, year: e.target.value }))}
                    />
                    {error(detailsErrors, "year")}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    rows={2}
                    placeholder="Street, Sangkat, Khan, City"
                    value={details.address}
                    onChange={(e) => setDetails((prev) => ({ ...prev, address: e.target.value }))}
                  />
                  {error(detailsErrors, "address")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">About me</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    placeholder="A short introduction for recruiters..."
                    value={details.bio}
                    onChange={(e) => setDetails((prev) => ({ ...prev, bio: e.target.value }))}
                  />
                  {error(detailsErrors, "bio")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill">Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      id="skill"
                      value={skillInput}
                      placeholder="e.g. React, AutoCAD, English"
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addSkill}>
                      <Plus /> Add
                    </Button>
                  </div>
                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                          {skill}
                          <button
                            type="button"
                            aria-label={`Remove ${skill}`}
                            onClick={() =>
                              setSkills((prev) => prev.filter((item) => item !== skill))
                            }
                            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No skills listed yet. Add the ones you want recruiters to see.
                    </p>
                  )}
                  {error(detailsErrors, "skills")}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="cv" className="flex items-center gap-2">
                    <FileText className="size-4" /> Curriculum vitae
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id="cv"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="w-full sm:max-w-sm"
                      onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                    />
                    {student?.cv && (
                      <a
                        href={fileUrl(student.cv)}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Current CV <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Attached automatically when you apply without a CV.
                  </p>
                  {error(detailsErrors, "cv")}
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-4">
                <Button type="submit" disabled={savingDetails}>
                  <Save /> {savingDetails ? "Saving..." : "Save profile"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <Avatar className="size-20">
                {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name} />}
                <AvatarFallback className="text-xl">
                  <UserIcon className="size-8" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {student?.student_id && (
                  <p className="text-sm text-muted-foreground">ID: {student.student_id}</p>
                )}
              </div>
              {student ? (
                <div className="grid w-full gap-2 border-t pt-4 text-left text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Major</span>
                    <span className="text-right font-medium">{student.major || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Department</span>
                    <span className="text-right font-medium">{departmentName || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Year</span>
                    <span className="text-right font-medium">{student.year || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Gender</span>
                    <span className="text-right font-medium">
                      {student.gender ? (GENDER_LABELS[student.gender] ?? student.gender) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Date of birth</span>
                    <span className="text-right font-medium">
                      {student.date_of_birth ? formatDate(student.date_of_birth) : "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No student record is linked to this account yet. Contact the internship office.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="size-4" /> Security
              </CardTitle>
              <CardDescription>Change the password you use to sign in.</CardDescription>
            </CardHeader>
            <form onSubmit={savePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={passwords.current_password}
                    onChange={(e) =>
                      setPasswords((prev) => ({ ...prev, current_password: e.target.value }))
                    }
                  />
                  {error(passwordErrors, "current_password")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={passwords.password}
                    onChange={(e) =>
                      setPasswords((prev) => ({ ...prev, password: e.target.value }))
                    }
                  />
                  {error(passwordErrors, "password")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirm new password</Label>
                  <Input
                    id="password_confirmation"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={passwords.password_confirmation}
                    onChange={(e) =>
                      setPasswords((prev) => ({
                        ...prev,
                        password_confirmation: e.target.value,
                      }))
                    }
                  />
                  {error(passwordErrors, "password_confirmation")}
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-4">
                <Button type="submit" disabled={savingPassword}>
                  <Lock /> {savingPassword ? "Updating..." : "Change password"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
