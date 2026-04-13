// components/jobs/jobs-page-client.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { JobCard } from "@/components/jobs/job-card";
import { JobFiltersPanel } from "@/components/jobs/job-filters-panel";
import { JobDetailPanel } from "@/components/jobs/job-detail-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import type { Job } from "@prisma/client";
import type { PaginatedResponse } from "@/types";

type JobWithMeta = Job & { isSaved?: boolean; isApplied?: boolean };

// ─── Quick filter chips ───────────────────────────────────────────

const QUICK_FILTERS = [
  { label: "All", params: {} },
  { label: "Remote", params: { remote: "true" } },
  { label: "Internships", params: { jobType: "INTERNSHIP" } },
  { label: "Frontend", params: { search: "frontend" } },
  { label: "Backend", params: { search: "backend" } },
  { label: "Full Stack", params: { search: "full stack" } },
  { label: "With visa", params: { visaSponsorship: "true" } },
];

function QuickFilterChips() {
  const searchParams = useSearchParams();
  const router = useRouter();

  function applyQuickFilter(params: Record<string, string>) {
    const newParams = new URLSearchParams(params);
    router.push(`/jobs?${newParams.toString()}`);
  }

  const activeFilter = QUICK_FILTERS.find((f) => {
    const keys = Object.keys(f.params);
    if (keys.length === 0 && searchParams.size === 0) return true;
    return keys.every(
      (k) => searchParams.get(k) === (f.params as Record<string, string>)[k]
    );
  });

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((f) => (
        <button
          key={f.label}
          onClick={() => applyQuickFilter(f.params as Record<string, string>)}
          className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-all ${
            activeFilter?.label === f.label
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────

export function JobsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [jobs, setJobs] = useState<JobWithMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithMeta | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = useCallback(
    async (pageNum = 1, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(pageNum));
        params.set("pageSize", "20");

        const res = await fetch(`/api/jobs?${params.toString()}`);
        const json = (await res.json()) as {
          success: boolean;
          data: PaginatedResponse<JobWithMeta>;
        };

        if (json.success) {
          const data = json.data;
          setJobs((prev) => (append ? [...prev, ...data.items] : data.items));
          setTotal(data.total);
          setHasMore(data.hasMore);
          if (data.items.length > 0 && pageNum === 1) {
            setSelectedJob(data.items[0]);
          }
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchParams]
  );

  // Re-fetch when search params change
  useEffect(() => {
    setPage(1);
    setSelectedJob(null);
    fetchJobs(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchJobs(next, true);
  }

  return (
    <div className="flex h-full gap-6">
      {/* ── Left column: filters + list ── */}
      <div className="flex w-full flex-col gap-4 lg:w-[440px] xl:w-[480px] flex-shrink-0 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {loading
              ? "Loading jobs…"
              : `${total.toLocaleString()} jobs found`}
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <JobFiltersPanel onClose={() => setShowFilters(false)} />
        )}

        {/* Quick chips */}
        <QuickFilterChips />

        {/* Job list */}
        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 scrollbar-hide">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800"
                >
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex gap-1.5">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-14 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedJob?.id === job.id}
                  onClick={() => setSelectedJob(job)}
                />
              ))}

          {/* Load more */}
          {hasMore && !loading && (
            <div className="py-4 text-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more jobs"
                )}
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && jobs.length === 0 && (
            <div className="rounded-xl border bg-white py-16 text-center dark:bg-gray-900 dark:border-gray-800">
              <p className="text-gray-400">No jobs match your filters.</p>
              <Button
                variant="link"
                className="mt-2 text-brand-600"
                onClick={() => router.push("/jobs")}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right column: job detail ── */}
      <div className="hidden flex-1 overflow-hidden lg:block">
        {selectedJob ? (
          <JobDetailPanel job={selectedJob} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800">
            <p className="text-sm text-gray-400">Select a job to see details</p>
          </div>
        )}
      </div>
    </div>
  );
}
