// components/jobs/job-filters-panel.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, RotateCcw } from "lucide-react";
import { WorkType, JobType, ExperienceLevel } from "@prisma/client";
import { workTypeLabel, jobTypeLabel, expLabel } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

export function JobFiltersPanel({ onClose }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [workTypes, setWorkTypes] = useState<WorkType[]>(
    (searchParams.getAll("workType") as WorkType[])
  );
  const [jobTypes, setJobTypes] = useState<JobType[]>(
    (searchParams.getAll("jobType") as JobType[])
  );
  const [expLevels, setExpLevels] = useState<ExperienceLevel[]>(
    (searchParams.getAll("experienceLevel") as ExperienceLevel[])
  );
  const [minSalary, setMinSalary] = useState(searchParams.get("minSalary") ?? "");
  const [visaOnly, setVisaOnly] = useState(searchParams.get("visaSponsorship") === "true");
  const [postedWithin, setPostedWithin] = useState(searchParams.get("postedWithin") ?? "");

  function toggle<T>(arr: T[], val: T, setter: (a: T[]) => void) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    // Clear old array params
    params.delete("workType");
    params.delete("jobType");
    params.delete("experienceLevel");

    workTypes.forEach((v) => params.append("workType", v));
    jobTypes.forEach((v) => params.append("jobType", v));
    expLevels.forEach((v) => params.append("experienceLevel", v));

    if (minSalary) params.set("minSalary", minSalary);
    else params.delete("minSalary");

    if (visaOnly) params.set("visaSponsorship", "true");
    else params.delete("visaSponsorship");

    if (postedWithin) params.set("postedWithin", postedWithin);
    else params.delete("postedWithin");

    params.set("page", "1");
    router.push(`/jobs?${params.toString()}`);
    onClose();
  }

  function resetFilters() {
    const search = searchParams.get("search");
    router.push(search ? `/jobs?search=${search}` : "/jobs");
    onClose();
  }

  return (
    <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800 animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5">
        {/* Work type */}
        <FilterGroup label="Work type">
          {Object.values(WorkType).map((wt) => (
            <Chip
              key={wt}
              label={workTypeLabel(wt)}
              active={workTypes.includes(wt)}
              onClick={() => toggle(workTypes, wt, setWorkTypes)}
            />
          ))}
        </FilterGroup>

        {/* Job type */}
        <FilterGroup label="Job type">
          {Object.values(JobType).map((jt) => (
            <Chip
              key={jt}
              label={jobTypeLabel(jt)}
              active={jobTypes.includes(jt)}
              onClick={() => toggle(jobTypes, jt, setJobTypes)}
            />
          ))}
        </FilterGroup>

        {/* Experience */}
        <FilterGroup label="Experience level">
          {Object.values(ExperienceLevel).map((el) => (
            <Chip
              key={el}
              label={expLabel(el)}
              active={expLevels.includes(el)}
              onClick={() => toggle(expLevels, el, setExpLevels)}
            />
          ))}
        </FilterGroup>

        {/* Salary */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Min salary (USD)</Label>
          <Input
            type="number"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
            placeholder="e.g. 60000"
            className="h-8 text-sm"
          />
        </div>

        {/* Posted within */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Posted within</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Today", val: "1" },
              { label: "3 days", val: "3" },
              { label: "1 week", val: "7" },
              { label: "1 month", val: "30" },
            ].map((o) => (
              <Chip
                key={o.val}
                label={o.label}
                active={postedWithin === o.val}
                onClick={() => setPostedWithin(postedWithin === o.val ? "" : o.val)}
              />
            ))}
          </div>
        </div>

        {/* Visa */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visaOnly}
            onChange={(e) => setVisaOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Visa sponsorship only</span>
        </label>
      </div>

      <div className="mt-5 flex gap-3">
        <Button
          onClick={applyFilters}
          className="flex-1 bg-brand-600 hover:bg-brand-800 text-white"
          size="sm"
        >
          Apply filters
        </Button>
        <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</Label>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}
