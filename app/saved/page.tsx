// app/saved/page.tsx
"use client";

import { useEffect, useState } from "react";
import { BookmarkCheck, Trash2, ExternalLink, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { formatRelativeDate, workTypeLabel, formatSalary } from "@/lib/utils";
import Link from "next/link";
import type { SavedJobWithJob } from "@/types";

const COLLECTIONS = [
  { id: "all", label: "All saved" },
  { id: "general", label: "General" },
  { id: "dream", label: "Dream companies" },
  { id: "remote", label: "Remote" },
  { id: "internships", label: "Internships" },
  { id: "apply-later", label: "Apply later" },
];

export default function SavedJobsPage() {
  const [saved, setSaved] = useState<SavedJobWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCollection, setActiveCollection] = useState("all");

  useEffect(() => {
    fetch("/api/saved-jobs")
      .then((r) => r.json())
      .then((json) => { if (json.success) setSaved(json.data); })
      .finally(() => setLoading(false));
  }, []);

  async function unsave(jobId: string) {
    const res = await fetch("/api/saved-jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    if (res.ok) {
      setSaved((prev) => prev.filter((s) => s.jobId !== jobId));
      toast({ title: "Removed from saved" });
    }
  }

  const displayed =
    activeCollection === "all"
      ? saved
      : saved.filter((s) => s.collection === activeCollection);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Saved jobs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {saved.length} saved · organised by collection
        </p>
      </div>

      {/* Collection tabs */}
      <div className="flex gap-2 flex-wrap">
        {COLLECTIONS.map((c) => {
          const count = c.id === "all" ? saved.length : saved.filter((s) => s.collection === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCollection(c.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCollection === c.id
                  ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              }`}
            >
              {c.label}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 dark:border-gray-700">
          <FolderOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No saved jobs in this collection.</p>
          <Link href="/jobs" className="mt-3">
            <Button variant="outline" size="sm">Browse jobs</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 rounded-xl border bg-white p-4 dark:bg-gray-900 dark:border-gray-800"
            >
              {/* Logo placeholder */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-brand-50 text-xs font-semibold text-brand-600 dark:border-gray-700 dark:bg-brand-900/30 dark:text-brand-400">
                {s.job.company.slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <Link href={`/jobs/${s.job.id}`} className="hover:text-brand-600">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {s.job.title}
                  </p>
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {s.job.company}
                  {s.job.location && ` · ${s.job.location}`}
                  {" · "}
                  <span className={s.job.workType === "REMOTE" ? "text-green-600 dark:text-green-400" : ""}>
                    {workTypeLabel(s.job.workType)}
                  </span>
                </p>
                {(s.job.salaryMin || s.job.salaryMax) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatSalary(s.job.salaryMin, s.job.salaryMax, s.job.currency ?? "USD")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400 hidden sm:block">
                  {formatRelativeDate(s.createdAt)}
                </span>
                <a
                  href={s.job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                  title="Open apply page"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => unsave(s.jobId)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  title="Remove from saved"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
