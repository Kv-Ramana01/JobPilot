// components/jobs/job-detail-panel.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Clock,
  DollarSign,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Zap,
  FileText,
  CheckCircle2,
  Globe,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  cn,
  formatRelativeDate,
  formatSalary,
  workTypeLabel,
  jobTypeLabel,
  expLabel,
} from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Job } from "@prisma/client";

type JobWithMeta = Job & { isSaved?: boolean; isApplied?: boolean };

interface Props {
  job: JobWithMeta;
}

export function JobDetailPanel({ job }: Props) {
  const [saved, setSaved] = useState(job.isSaved ?? false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(job.isApplied ?? false);

  async function toggleSave() {
    const res = await fetch(`/api/saved-jobs`, {
      method: saved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    });
    if (res.ok) {
      setSaved(!saved);
      toast({ title: saved ? "Removed from saved" : "Job saved!" });
    }
  }

  async function handleApply() {
    setApplying(true);
    try {
      // Track the application in DB
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, applyMode: "DIRECT_LINK" }),
      });
      if (res.ok) {
        setApplied(true);
        toast({ title: "Application tracked!", description: "Opening the apply page…" });
      }
      // Open the actual apply URL
      window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
            {job.companyLogo ? (
              <Image
                src={job.companyLogo}
                alt={job.company}
                fill
                className="object-contain p-1.5"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-brand-600">
                {job.company.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {job.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{job.company}</p>
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {job.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
              {job.location}
            </div>
          )}
          {job.postedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
              {formatRelativeDate(job.postedAt)}
            </div>
          )}
          {(job.salaryMin || job.salaryMax) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="h-4 w-4 flex-shrink-0 text-gray-400" />
              {formatSalary(job.salaryMin, job.salaryMax, job.currency ?? "USD")}
            </div>
          )}
          {job.source && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Globe className="h-4 w-4 flex-shrink-0 text-gray-400" />
              Via {job.source.charAt(0) + job.source.slice(1).toLowerCase()}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
              job.workType === "REMOTE"
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                : job.workType === "HYBRID"
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800"
            )}
          >
            {workTypeLabel(job.workType)}
          </span>
          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {jobTypeLabel(job.jobType)}
          </span>
          {job.experienceLevel && (
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {expLabel(job.experienceLevel)}
            </span>
          )}
          {job.visaSponsorship && (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Visa sponsorship
            </span>
          )}
        </div>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Skills required
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            About the role
          </h3>
          <div
            className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400 prose-headings:text-gray-900 dark:prose-headings:text-white"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="border-t p-4 dark:border-gray-800">
        <div className="flex gap-3">
          {applied ? (
            <Button disabled className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="h-4 w-4" />
              Applied
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 gap-2 bg-brand-600 hover:bg-brand-800 text-white"
            >
              <ExternalLink className="h-4 w-4" />
              {applying ? "Opening…" : "Apply now"}
            </Button>
          )}

          <Link href={`/resume-ai?jobId=${job.id}`}>
            <Button variant="outline" className="gap-1.5" title="Optimize resume for this job">
              <Zap className="h-4 w-4 text-brand-600" />
              AI optimize
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSave}
            title={saved ? "Remove from saved" : "Save job"}
          >
            {saved ? (
              <BookmarkCheck className="h-4 w-4 text-brand-600" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
