// lib/job-query.ts
// Builds Prisma where/orderBy from JobFilters — shared between API route and server actions

import { Prisma, WorkType, JobType, ExperienceLevel } from "@prisma/client";
import type { JobFilters } from "@/types";

export function buildJobWhere(filters: JobFilters): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = { isActive: true };

  // Full-text search across title, company, description, skills
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { skills: { has: q } },
    ];
  }

  if (filters.jobType?.length) {
    where.jobType = { in: filters.jobType };
  }

  if (filters.workType?.length) {
    where.workType = { in: filters.workType };
  }

  if (filters.experienceLevel?.length) {
    where.experienceLevel = { in: filters.experienceLevel };
  }

  if (filters.countries?.length) {
    where.country = { in: filters.countries };
  }

  if (filters.remote) {
    where.isRemote = true;
  }

  if (filters.visaSponsorship) {
    where.visaSponsorship = true;
  }

  if (filters.minSalary) {
    // salaryMax >= minSalary means the range overlaps
    where.salaryMax = { gte: filters.minSalary };
  }

  if (filters.maxSalary) {
    where.salaryMin = { lte: filters.maxSalary };
  }

  if (filters.postedWithin) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filters.postedWithin);
    where.postedAt = { gte: cutoff };
  }

  if (filters.source?.length) {
    where.source = { in: filters.source };
  }

  return where;
}

export function buildJobOrderBy(
  sortBy: JobFilters["sortBy"] = "newest"
): Prisma.JobOrderByWithRelationInput {
  switch (sortBy) {
    case "salary":
      return { salaryMax: "desc" };
    case "remote":
      return { isRemote: "desc" };
    case "match":
      // Without ML, fall back to newest for now
      return { postedAt: "desc" };
    default:
      return { postedAt: "desc" };
  }
}

/**
 * Score a job against a user's skill set (0-100).
 * Used for client-side "best match" sorting.
 */
export function computeMatchScore(
  jobSkills: string[],
  userSkills: string[]
): number {
  if (!jobSkills.length || !userSkills.length) return 0;
  const userSet = new Set(userSkills.map((s) => s.toLowerCase()));
  const matches = jobSkills.filter((s) => userSet.has(s.toLowerCase())).length;
  return Math.round((matches / jobSkills.length) * 100);
}
