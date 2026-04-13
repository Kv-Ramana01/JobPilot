// components/jobs/job-card.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Bookmark, BookmarkCheck, MapPin, Clock, DollarSign, ExternalLink } from "lucide-react";
import { cn, formatRelativeDate, formatSalary, workTypeLabel, jobTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@prisma/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface JobCardProps {
  job: Job & { isSaved?: boolean; isApplied?: boolean };
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const WORK_TYPE_COLOR: Record<string, string> = {
  REMOTE: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  HYBRID: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  ONSITE: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

function CompanyLogo({ logo, company }: { logo?: string | null; company: string }) {
  const [error, setError] = useState(false);
  const initials = company.slice(0, 2).toUpperCase();

  if (logo && !error) {
    return (
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
        <Image
          src={logo}
          alt={company}
          fill
          className="object-contain p-1"
          onError={() => setError(true)}
          sizes="40px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-brand-50 text-xs font-semibold text-brand-600 dark:border-gray-700 dark:bg-brand-900/30 dark:text-brand-400">
      {initials}
    </div>
  );
}

export function JobCard({ job, compact = false, selected, onClick }: JobCardProps) {
  const [saved, setSaved] = useState(job.isSaved ?? false);
  const [saving, setSaving] = useState(false);

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      const res = await fetch(`/api/saved-jobs`, {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!res.ok) throw new Error();
      setSaved(!saved);
      toast({
        title: saved ? "Removed from saved" : "Job saved!",
        description: saved ? undefined : "Find it in Saved jobs.",
      });
    } catch {
      toast({ title: "Error", description: "Could not save job.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (compact) {
    return (
      <Link
        href={`/jobs/${job.id}`}
        className={cn(
          "flex items-start gap-3 rounded-xl border bg-white p-4 transition-all hover:shadow-sm dark:bg-gray-900 dark:border-gray-800",
          selected && "border-brand-300 ring-1 ring-brand-200"
        )}
      >
        <CompanyLogo logo={job.companyLogo} company={job.company} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{job.title}</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{job.company}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", WORK_TYPE_COLOR[job.workType])}>
              {workTypeLabel(job.workType)}
            </span>
            {job.salaryMin && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {formatSalary(job.salaryMin, job.salaryMax, job.currency ?? "USD")}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/jobs/${job.id}`}
      onClick={onClick}
      className={cn(
        "group block rounded-xl border bg-white p-5 transition-all hover:shadow-sm dark:bg-gray-900 dark:border-gray-800",
        selected && "border-brand-300 ring-1 ring-brand-200 dark:border-brand-700"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <CompanyLogo logo={job.companyLogo} company={job.company} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-600">
                {job.title}
              </h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {job.company}
              </p>
            </div>

            <button
              onClick={toggleSave}
              disabled={saving}
              className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-800"
            >
              {saved ? (
                <BookmarkCheck className="h-4 w-4 text-brand-600" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            {job.postedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(job.postedAt)}
              </span>
            )}
            {(job.salaryMin || job.salaryMax) && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatSalary(job.salaryMin, job.salaryMax, job.currency ?? "USD")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", WORK_TYPE_COLOR[job.workType])}>
          {workTypeLabel(job.workType)}
        </span>
        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {jobTypeLabel(job.jobType)}
        </span>
        {job.visaSponsorship && (
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Visa sponsorship
          </span>
        )}
        {job.skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            {s}
          </span>
        ))}
        {job.skills.length > 4 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            +{job.skills.length - 4} more
          </span>
        )}
      </div>

      {/* Applied badge */}
      {job.isApplied && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
            ✓ Applied
          </span>
        </div>
      )}
    </Link>
  );
}
