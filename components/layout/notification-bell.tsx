// components/layout/notification-bell.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, CheckCheck, Briefcase, CalendarCheck, Gift, Info } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import Link from "next/link";
import type { Notification } from "@prisma/client";

interface NotifData {
  notifications: Notification[];
  unreadCount: number;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  NEW_JOBS: Briefcase,
  APPLICATION_UPDATE: CalendarCheck,
  ALERT_MATCH: Briefcase,
  INTERVIEW_REMINDER: CalendarCheck,
  SYSTEM: Info,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotifData>({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Fetch on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications?limit=10")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData({ notifications: json.data, unreadCount: json.unreadCount });
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setData((prev) => ({
      notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {data.unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-brand-600">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
              {data.unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                  {data.unreadCount} new
                </span>
              )}
            </h3>
            {data.unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
            ) : data.notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              data.notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Info;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50",
                      !n.isRead && "bg-brand-50/50 dark:bg-brand-900/10"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg mt-0.5",
                      !n.isRead ? "bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatRelativeDate(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5 dark:border-gray-800">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
