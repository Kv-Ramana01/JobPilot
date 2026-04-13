// components/dashboard/recent-activity.tsx
import Link from "next/link";
import { formatRelativeDate, statusColor, statusLabel } from "@/lib/utils";
import { Application, Job } from "@prisma/client";
import { cn } from "@/lib/utils";

type AppWithJob = Application & { job: Job };

const STATUS_DOT: Record<string, string> = {
  APPLIED: "bg-blue-500",
  INTERVIEW: "bg-green-500",
  OFFER: "bg-purple-500",
  REJECTED: "bg-red-500",
  OA: "bg-amber-500",
  SAVED: "bg-gray-400",
  WITHDRAWN: "bg-gray-400",
};

export function RecentActivity({ applications }: { applications: AppWithJob[] }) {
  return (
    <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Recent activity</h3>
        <Link
          href="/applications"
          className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400"
        >
          View all
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No applications yet.{" "}
          <Link href="/jobs" className="text-brand-600 hover:underline">
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-0.5">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="relative mt-1.5">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full flex-shrink-0",
                    STATUS_DOT[app.status] ?? "bg-gray-400"
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-medium">{app.job.company}</span> —{" "}
                  {app.job.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      statusColor(app.status)
                    )}
                  >
                    {statusLabel(app.status)}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {formatRelativeDate(app.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
