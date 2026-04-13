// app/applications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ApplicationStatus } from "@prisma/client";
import { formatRelativeDate, statusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink, StickyNote, ChevronDown } from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import type { ApplicationWithJob } from "@/types";

const COLUMNS: { status: ApplicationStatus; label: string; color: string }[] = [
  { status: ApplicationStatus.APPLIED, label: "Applied", color: "bg-blue-500" },
  { status: ApplicationStatus.OA, label: "Online test", color: "bg-amber-500" },
  { status: ApplicationStatus.INTERVIEW, label: "Interview", color: "bg-green-500" },
  { status: ApplicationStatus.OFFER, label: "Offer 🎉", color: "bg-purple-500" },
  { status: ApplicationStatus.REJECTED, label: "Rejected", color: "bg-red-400" },
];

export default function ApplicationsPage() {
  const [apps, setApps] = useState<ApplicationWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setApps(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(appId: string, status: ApplicationStatus) {
    const res = await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      );
      toast({ title: "Status updated" });
    }
  }

  const byStatus = (status: ApplicationStatus) =>
    apps.filter((a) => a.status === status);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Applications
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {apps.length} total · track every application
          </p>
        </div>
        <Link href="/jobs">
          <Button className="bg-brand-600 hover:bg-brand-800 text-white">
            Find more jobs
          </Button>
        </Link>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5 overflow-x-auto">
        {loading
          ? COLUMNS.map((col) => (
              <div key={col.status} className="space-y-2">
                <Skeleton className="h-5 w-24" />
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ))
          : COLUMNS.map((col) => {
              const colApps = byStatus(col.status);
              return (
                <div key={col.status} className="flex flex-col gap-3 min-w-[200px]">
                  {/* Column header */}
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${col.color}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {col.label}
                    </span>
                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2.5">
                    {colApps.map((app) => (
                      <ApplicationKanbanCard
                        key={app.id}
                        app={app}
                        onStatusChange={(s) => updateStatus(app.id, s)}
                      />
                    ))}
                    {colApps.length === 0 && (
                      <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400 dark:border-gray-700">
                        None yet
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ─── Individual Kanban Card ───────────────────────────────────────

function ApplicationKanbanCard({
  app,
  onStatusChange,
}: {
  app: ApplicationWithJob;
  onStatusChange: (s: ApplicationStatus) => void;
}) {
  const [showMove, setShowMove] = useState(false);

  const MOVE_OPTIONS = COLUMNS.filter((c) => c.status !== app.status);

  return (
    <div className="rounded-xl border bg-white p-3.5 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      {/* Company + role */}
      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
        {app.job.company}
      </p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
        {app.job.title}
      </p>

      {/* Date */}
      <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        {app.appliedAt
          ? formatRelativeDate(app.appliedAt)
          : formatRelativeDate(app.createdAt)}
      </p>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1.5">
        <a
          href={app.job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </a>

        <div className="relative ml-auto">
          <button
            onClick={() => setShowMove(!showMove)}
            className="flex items-center gap-0.5 rounded-md px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            Move <ChevronDown className="h-3 w-3" />
          </button>

          {showMove && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700">
              {MOVE_OPTIONS.map((opt) => (
                <button
                  key={opt.status}
                  onClick={() => {
                    onStatusChange(opt.status);
                    setShowMove(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${opt.color}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
