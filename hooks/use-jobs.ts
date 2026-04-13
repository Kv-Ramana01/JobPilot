// hooks/use-jobs.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Job } from "@prisma/client";
import type { JobFilters, PaginatedResponse } from "@/types";

type JobWithMeta = Job & { isSaved?: boolean; isApplied?: boolean };

interface UseJobsReturn {
  jobs: JobWithMeta[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  fetchJobs: (filters?: JobFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

export function useJobs(initialFilters?: JobFilters): UseJobsReturn {
  const [jobs, setJobs] = useState<JobWithMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef<JobFilters | undefined>(initialFilters);

  const buildUrl = useCallback((filters: JobFilters | undefined, pageNum: number) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.jobType?.length) params.set("jobType", filters.jobType.join(","));
    if (filters?.workType?.length) params.set("workType", filters.workType.join(","));
    if (filters?.countries?.length) params.set("countries", filters.countries.join(","));
    if (filters?.remote) params.set("remote", "true");
    if (filters?.visaSponsorship) params.set("visaSponsorship", "true");
    if (filters?.minSalary) params.set("minSalary", String(filters.minSalary));
    if (filters?.postedWithin) params.set("postedWithin", String(filters.postedWithin));
    if (filters?.sortBy) params.set("sortBy", filters.sortBy);
    params.set("page", String(pageNum));
    params.set("pageSize", String(filters?.pageSize ?? 20));
    return `/api/jobs?${params.toString()}`;
  }, []);

  const fetchJobs = useCallback(async (filters?: JobFilters) => {
    if (filters) filtersRef.current = filters;
    setLoading(true);
    setError(null);
    setPage(1);

    try {
      const res = await fetch(buildUrl(filtersRef.current, 1));
      const json = (await res.json()) as { success: boolean; data: PaginatedResponse<JobWithMeta>; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to fetch jobs");
      setJobs(json.data.items);
      setTotal(json.data.total);
      setHasMore(json.data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const res = await fetch(buildUrl(filtersRef.current, nextPage));
      const json = (await res.json()) as { success: boolean; data: PaginatedResponse<JobWithMeta> };
      if (json.success) {
        setJobs((prev) => [...prev, ...json.data.items]);
        setHasMore(json.data.hasMore);
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, hasMore, loadingMore, page]);

  const reset = useCallback(() => {
    setJobs([]);
    setTotal(0);
    setPage(1);
    setHasMore(false);
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchJobs(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { jobs, total, loading, loadingMore, hasMore, error, fetchJobs, loadMore, reset };
}
