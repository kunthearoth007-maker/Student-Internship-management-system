"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Power, ShieldOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ApiError, sendData } from "@/lib/api";
import type { User } from "@/types";

type Pending = "suspend" | "reactivate" | "delete" | null;

/** Suspend / reactivate / edit / delete one account. Used by every admin user table. */
export function AccountActions({
  account,
  onDone,
}: {
  account?: User | null;
  onDone: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [working, setWorking] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  if (!account) return <span className="text-sm text-muted-foreground">—</span>;

  const startEdit = () => {
    setForm({ name: account.name, email: account.email });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setWorking(true);
    try {
      await sendData("put", `/admin/users/${account.id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
      });
      toast.success("Account updated");
      setEditOpen(false);
      onDone();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.fieldError("email") ?? err.fieldError("name") ?? err.message
          : "Could not update the account"
      );
    } finally {
      setWorking(false);
    }
  };

  const run = async () => {
    if (!pending) return;
    setWorking(true);
    try {
      if (pending === "delete") {
        await sendData("delete", `/admin/users/${account.id}`);
        toast.success(`${account.name} deleted`);
      } else {
        await sendData("put", `/admin/users/${account.id}/${pending}`);
        toast.success(pending === "suspend" ? "Account suspended" : "Account reactivated");
      }
      setPending(null);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setWorking(false);
    }
  };

  const suspended = Boolean(account.is_suspended);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {suspended && (
          <Badge className="border-transparent bg-rose-100 text-[10px] text-rose-700">
            Suspended
          </Badge>
        )}
        <Button
          size="xs"
          variant="ghost"
          className="gap-1.5 rounded-full text-slate-600"
          onClick={startEdit}
        >
          <Pencil className="size-3.5" /> Edit
        </Button>
        <Button
          size="xs"
          variant="outline"
          className={
            suspended
              ? "gap-1.5 text-emerald-700 hover:text-emerald-800"
              : "gap-1.5 text-amber-700 hover:text-amber-800"
          }
          onClick={() => setPending(suspended ? "reactivate" : "suspend")}
        >
          {suspended ? (
            <>
              <Power className="size-3.5" /> Reactivate
            </>
          ) : (
            <>
              <ShieldOff className="size-3.5" /> Suspend
            </>
          )}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          className="gap-1.5 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setPending("delete")}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>
              {account.role} account. Changing the email changes how they sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Name</Label>
              <Input
                id="account-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={working} onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-primary hover:bg-primary-hover"
              disabled={working || !form.name.trim() || !form.email.trim()}
              onClick={saveEdit}
            >
              {working ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending === "delete"
            ? `Delete ${account.name}?`
            : pending === "suspend"
              ? `Suspend ${account.name}?`
              : `Reactivate ${account.name}?`
        }
        description={
          pending === "delete"
            ? "This removes the account and its profile. Their applications and reports stay in the history."
            : pending === "suspend"
              ? "They are signed out immediately and cannot log in or call the API again until reactivated."
              : "They can sign in again with their existing token cleared."
        }
        confirmLabel={
          pending === "delete" ? "Delete" : pending === "suspend" ? "Suspend" : "Reactivate"
        }
        destructive={pending === "delete" || pending === "suspend"}
        loading={working}
        onConfirm={run}
      />
    </>
  );
}
