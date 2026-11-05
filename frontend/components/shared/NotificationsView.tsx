"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AppPagination } from "@/components/shared/AppPagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { getData, sendData } from "@/lib/api";
import { portalLink } from "@/lib/links";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { NotificationFeed, NotificationItem, Role } from "@/types";
import { toast } from "sonner";

const TYPE_LABEL: Record<string, string> = {
  application: "Application",
  assignment: "Assignment",
  report: "Report",
  evaluation: "Evaluation",
  offer: "Offer",
  message: "Message",
  meeting: "Meeting",
  attendance: "Attendance",
  company: "Company",
  internship: "Internship",
  account: "Account",
};

export function NotificationsView({ role }: { role: Role }) {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [meta, setMeta] = useState<NotificationFeed["pagination"]>();
  const [page, setPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<NotificationItem | null>(null);

  const load = useCallback(() => {
    return getData<NotificationFeed>("/notifications", {
      page,
      per_page: 20,
      unread_only: onlyUnread ? 1 : 0,
    })
      .then((feed) => {
        setItems(feed.items);
        setUnreadCount(feed.unread_count);
        setMeta(feed.pagination);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not load notifications");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [page, onlyUnread]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        await sendData("put", `/notifications/${item.id}/read`);
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // navigation still works if the mark-read call fails
      }
    }
    router.push(portalLink(item.link, role));
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await sendData("put", "/notifications/read-all");
      toast.success("All notifications marked as read");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update notifications");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await sendData("delete", `/notifications/${pendingDelete.id}`);
      toast.success("Notification removed");
      setPendingDelete(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove notification");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Every update shared with you across the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={onlyUnread ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => {
              setPage(1);
              setOnlyUnread((v) => !v);
            }}
          >
            {onlyUnread ? `Unread only (${unreadCount})` : "Show unread only"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            disabled={busy || unreadCount === 0}
            onClick={markAll}
          >
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading notifications..." />
      ) : items.length === 0 ? (
        <EmptyState
          title={onlyUnread ? "No unread notifications" : "You are all caught up"}
          description={
            onlyUnread
              ? "Switch back to all notifications to see your history."
              : `New activity for ${user?.role ?? role} accounts lands here automatically.`
          }
          action={
            onlyUnread
              ? {
                  label: "Show all",
                  onClick: () => {
                    setOnlyUnread(false);
                    setPage(1);
                  },
                }
              : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className={`border-slate-200/70 shadow-sm transition-colors hover:border-slate-300 ${
                  item.read ? "bg-card" : "bg-blue-50/40"
                }`}
              >
                <CardContent className="flex items-start gap-3 pt-5">
                  <span
                    className={`mt-2 size-2.5 shrink-0 rounded-full ${
                      item.read ? "bg-slate-200" : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="truncate text-left text-sm font-semibold text-slate-900 hover:text-primary"
                        onClick={() => open(item)}
                      >
                        {item.title}
                      </button>
                      <Badge
                        variant="outline"
                        className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-600"
                      >
                        {TYPE_LABEL[item.type] ?? item.type}
                      </Badge>
                    </div>
                    {item.body && (
                      <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground/70">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full text-xs"
                        onClick={() => open(item)}
                      >
                        Open
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full text-muted-foreground hover:text-rose-600"
                      aria-label="Delete notification"
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <AppPagination meta={meta} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove this notification?"
        description={pendingDelete?.title}
        confirmLabel="Remove"
        destructive
        loading={busy}
        onConfirm={remove}
      />
    </div>
  );
}
