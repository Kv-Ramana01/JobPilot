// components/jobs/job-detail-full.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Clock, DollarSign, ExternalLink, Bookmark, BookmarkCheck,
  Zap, ArrowLeft, Globe, Users, CheckCircle2, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cn, formatRelativeDate, formatSalary, workTypeLabel, jobTypeLabel, expLabel,
} from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Job } from "@prisma/client";

type JobWithMeta = Job & { isSaved?: boolean; isApplied?: boolean };

export function JobDetailFull({ job }: { job: JobWithMeta }) {
  const [saved, setSaved] = useState(job.isSaved ?? false);
  const [applied, setApplied] = useState(job.isApplied ?? false);
  const [applying, setApplying] = useState(false);

  async function toggleSave() {
    const res = await fetch("/api/saved-jobs", {
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
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, applyMode: "DIRECT_LINK" }),
      });
      if (res.ok) {
        setApplied(true);
        toast({ title: "Application tracked!", description: "Opening apply page…" });
      }
      window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      {/* Header card */}
      <div className="rounded-xl border bg-white p-6 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-start gap-5">
          {/* Logo */}
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
            {job.companyLogo ? (
              <Image src={job.companyLogo} alt={job.company} fill className="object-contain p-2" sizes="64px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-brand-600">
                {job.company.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{job.title}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <Building2 className="h-4 w-4" />
                {job.company}
              </span>
              {job.location && (
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          <span className={cn(
            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
            job.workType === "REMOTE"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
              : job.workType === "HYBRID"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
              : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          )}>
            {workTypeLabel(job.workType)}
          </span>
          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {jobTypeLabel(job.jobType)}
          </span>
          {job.experienceLevel && (
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {expLabel(job.experienceLevel)}
            </span>
          )}
          {job.visaSponsorship && (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Visa sponsorship
            </span>
          )}
          {job.postedAt && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Clock className="h-3 w-3" />
              {formatRelativeDate(job.postedAt)}
            </span>
          )}
        </div>

        {/* Salary */}
        {(job.salaryMin || job.salaryMax) && (
          <div className="mt-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatSalary(job.salaryMin, job.salaryMax, job.currency ?? "USD")}
            </span>
            <span className="text-xs text-gray-400">per year</span>
          </div>
        )}

        {/* CTA buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {applied ? (
            <Button disabled className="gap-2 bg-green-600 text-white">
              <CheckCircle2 className="h-4 w-4" />
              Applied
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              disabled={applying}
              className="gap-2 bg-brand-600 hover:bg-brand-800 text-white"
            >
              <ExternalLink className="h-4 w-4" />
              {applying ? "Opening…" : "Apply now"}
            </Button>
          )}

          <Link href={`/resume-ai?jobId=${job.id}&title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}`}>
            <Button variant="outline" className="gap-2">
              <Zap className="h-4 w-4 text-brand-600" />
              Optimize resume
            </Button>
          </Link>

          <Button variant="outline" onClick={toggleSave} className="gap-2">
            {saved ? (
              <><BookmarkCheck className="h-4 w-4 text-brand-600" /> Saved</>
            ) : (
              <><Bookmark className="h-4 w-4" /> Save</>
            )}
          </Button>
        </div>
      </div>

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Skills required</h2>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <span
                key={s}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="rounded-xl border bg-white p-6 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">About the role</h2>
        <div
          className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400 prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white prose-ul:my-2 prose-li:my-0.5"
          dangerouslySetInnerHTML={{ __html: job.description }}
        />
      </div>

      {/* Source */}
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pb-4">
        <Globe className="h-3.5 w-3.5" />
        Listed via {job.source.charAt(0) + job.source.slice(1).toLowerCase()}
        {job.postedAt && ` · Posted ${formatRelativeDate(job.postedAt)}`}
      </div>
    </div>
  );
}
