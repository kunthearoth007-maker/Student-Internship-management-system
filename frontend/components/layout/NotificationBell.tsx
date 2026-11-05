"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getData, sendData } from "@/lib/api";
import { portalLink } from "@/lib/links";
import type { NotificationFeed, NotificationItem, Role } from "@/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ role }: { role: Role }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    return getData<NotificationFeed>("/notifications", { per_page: 8 })
      .then((feed) => {
        setItems(feed.items);
        setUnreadCount(feed.unread_count);
      })
      .catch(() => {
        setItems([]);
        setUnreadCount(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      getData<NotificationFeed>("/notifications", { per_page: 1 })
        .then((feed) => setUnreadCount(feed.unread_count))
        .catch(() => undefined);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const markAll = async () => {
    try {
      await sendData("put", "/notifications/read-all");
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch {
      // keep showing the last successful load
    }
  };

  const openItem = (item: NotificationItem) => {
    setOpen(false);
    if (!item.read) {
      sendData("put", `/notifications/${item.id}/read`)
        .then(() => {
          setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
          setUnreadCount((count) => Math.max(0, count - 1));
        })
        .catch(() => undefined);
    }
    router.push(portalLink(item.link, role));
  };

  return (
    <DropdownMenu open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) load();
    }}>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold text-primary-foreground ring-2 ring-card">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="font-bold">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium text-primary hover:bg-blue-50 hover:text-primary-hover"
                onClick={(e) => {
                  e.preventDefault();
                  markAll();
                }}
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {loading ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <Inbox className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You are all caught up.</p>
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex items-start gap-3 py-2.5"
              onClick={() => openItem(item)}
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  item.read ? "bg-slate-200" : "bg-primary"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {item.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{item.body}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                  {timeAgo(item.created_at)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="justify-center text-primary">
            <Link href={`/${role}/notifications`} onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
