// app/api/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { aggregateJobs } from "@/services/job-aggregator";
import { z } from "zod";
import type { JobFilters } from "@/types";
import { JobType, WorkType, ExperienceLevel, Prisma } from "@prisma/client";

// ─── GET /api/jobs — search & filter jobs ─────────────────────────

const filtersSchema = z.object({
  search: z.string().optional(),
  jobType: z.array(z.nativeEnum(JobType)).optional(),
  workType: z.array(z.nativeEnum(WorkType)).optional(),
  experienceLevel: z.array(z.nativeEnum(ExperienceLevel)).optional(),
  countries: z.array(z.string()).optional(),
  remote: z.coerce.boolean().optional(),
  visaSponsorship: z.coerce.boolean().optional(),
  minSalary: z.coerce.number().optional(),
  maxSalary: z.coerce.number().optional(),
  postedWithin: z.coerce.number().optional(), // days
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
  sortBy: z.enum(["newest", "salary", "match", "remote"]).default("newest"),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const sp = Object.fromEntries(req.nextUrl.searchParams);

    // Parse array params from comma-separated strings
    if (typeof sp.jobType === "string") {
      (sp as Record<string, unknown>).jobType = sp.jobType.split(",");
    }
    if (typeof sp.workType === "string") {
      (sp as Record<string, unknown>).workType = sp.workType.split(",");
    }
    if (typeof sp.countries === "string") {
      (sp as Record<string, unknown>).countries = sp.countries.split(",");
    }

    const filters = filtersSchema.parse(sp);

    // Build Prisma where clause
    const where: Prisma.JobWhereInput = {
      isActive: true,
    };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { company: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { skills: { has: filters.search } },
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

    // Sorting
    let orderBy: Prisma.JobOrderByWithRelationInput = { postedAt: "desc" };
    if (filters.sortBy === "salary") {
      orderBy = { salaryMax: "desc" };
    } else if (filters.sortBy === "remote") {
      orderBy = { isRemote: "desc" };
    }

    const skip = (filters.page - 1) * filters.pageSize;

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        orderBy,
        skip,
        take: filters.pageSize,
      }),
      db.job.count({ where }),
    ]);

    // If user is logged in, fetch their saved jobs and applications to annotate
    let savedJobIds = new Set<string>();
    let appliedJobIds = new Set<string>();

    if (userId) {
      const user = await db.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
      if (user) {
        const [saved, applied] = await Promise.all([
          db.savedJob.findMany({
            where: { userId: user.id },
            select: { jobId: true },
          }),
          db.application.findMany({
            where: { userId: user.id },
            select: { jobId: true },
          }),
        ]);
        savedJobIds = new Set(saved.map((s) => s.jobId));
        appliedJobIds = new Set(applied.map((a) => a.jobId));
      }
    }

    const enrichedJobs = jobs.map((job) => ({
      ...job,
      isSaved: savedJobIds.has(job.id),
      isApplied: appliedJobIds.has(job.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: enrichedJobs,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        hasMore: skip + jobs.length < total,
      },
    });
  } catch (err) {
    console.error("[GET /api/jobs]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid filters", details: err.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// ─── POST /api/jobs/sync — trigger job aggregation (cron / admin) ─

export async function POST(req: NextRequest) {
  // Protect with a secret header for cron use
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawJobs = await aggregateJobs();
    let upserted = 0;
    let errors = 0;

    // Upsert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < rawJobs.length; i += batchSize) {
      const batch = rawJobs.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (job) => {
          try {
            await db.job.upsert({
              where: {
                externalId_source: {
                  externalId: job.externalId,
                  source: job.source,
                },
              },
              create: {
                externalId: job.externalId,
                source: job.source,
                sourceUrl: job.sourceUrl,
                title: job.title,
                company: job.company,
                companyLogo: job.companyLogo,
                location: job.location,
                country: job.country,
                isRemote: job.isRemote,
                workType: job.workType,
                jobType: job.jobType,
                description: job.description,
                requirements: job.requirements,
                skills: job.skills,
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                currency: job.currency ?? "USD",
                postedAt: job.postedAt,
                deadline: job.deadline,
                visaSponsorship: job.visaSponsorship ?? false,
                experienceLevel: job.experienceLevel,
                isActive: true,
              },
              update: {
                title: job.title,
                description: job.description,
                skills: job.skills,
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                isActive: true,
                updatedAt: new Date(),
              },
            });
            upserted++;
          } catch {
            errors++;
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${upserted} jobs (${errors} errors)`,
      upserted,
      errors,
    });
  } catch (err) {
    console.error("[POST /api/jobs/sync]", err);
    return NextResponse.json(
      { success: false, error: "Sync failed" },
      { status: 500 }
    );
  }
}
