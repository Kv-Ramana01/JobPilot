// app/api/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { aggregateJobs } from "@/services/job-aggregator";
import { z } from "zod";
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
    const sp = Object.fromEntries(req.nextUrl.searchParams) as Record<string, unknown>;

    // Parse array params from comma-separated strings
    if (typeof sp.jobType === "string" && sp.jobType) {
      sp.jobType = sp.jobType.split(",").filter(Boolean);
    } else if (!sp.jobType) {
      delete sp.jobType;
    }

    if (typeof sp.workType === "string" && sp.workType) {
      sp.workType = sp.workType.split(",").filter(Boolean);
    } else if (!sp.workType) {
      delete sp.workType;
    }

    if (typeof sp.countries === "string" && sp.countries) {
      sp.countries = sp.countries.split(",").filter(Boolean);
    } else if (!sp.countries) {
      delete sp.countries;
    }

    if (typeof sp.experienceLevel === "string" && sp.experienceLevel) {
      sp.experienceLevel = sp.experienceLevel.split(",").filter(Boolean);
    } else if (!sp.experienceLevel) {
      delete sp.experienceLevel;
    }

    const filters = filtersSchema.parse(sp);

    // Build Prisma where clause
    const where: Prisma.JobWhereInput = {
      isActive: true,
    };

    if (filters.search && filters.search.trim()) {
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
    const take = Math.min(filters.pageSize, 100); // cap at 100

    const [jobs, total] = await Promise.all([
      db.job.findMany({ where, orderBy, skip, take }),
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
    console.error("[GET /api/jobs]", err instanceof Error ? err.message : err);
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
  const cronSecret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("[POST /api/jobs] Starting sync...");

  try {
    const rawJobs = await aggregateJobs();
    console.log(`[POST /api/jobs] Got ${rawJobs.length} raw jobs`);

    let upserted = 0;
    let errors = 0;

    // Upsert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < rawJobs.length; i += batchSize) {
      const batch = rawJobs.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (job) => {
          try {
            if (!job.externalId || !job.source || !job.title) {
              errors++;
              return;
            }

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
                companyLogo: job.companyLogo ?? null,
                location: job.location ?? null,
                country: job.country ?? null,
                isRemote: job.isRemote ?? false,
                workType: job.workType,
                jobType: job.jobType,
                description: job.description || "<p>No description available.</p>",
                requirements: job.requirements ?? null,
                skills: job.skills ?? [],
                salaryMin: job.salaryMin ?? null,
                salaryMax: job.salaryMax ?? null,
                currency: job.currency ?? "USD",
                postedAt: job.postedAt ?? new Date(),
                deadline: job.deadline ?? null,
                visaSponsorship: job.visaSponsorship ?? false,
                experienceLevel: job.experienceLevel ?? null,
                isActive: true,
              },
              update: {
                title: job.title,
                description: job.description || "<p>No description available.</p>",
                skills: job.skills ?? [],
                salaryMin: job.salaryMin ?? null,
                salaryMax: job.salaryMax ?? null,
                isActive: true,
                updatedAt: new Date(),
              },
            });
            upserted++;
          } catch (err) {
            errors++;
            console.error(`[POST /api/jobs] Upsert failed for ${job.externalId}:`, err instanceof Error ? err.message : err);
          }
        })
      );
    }

    const durationMs = Date.now() - startTime;
    console.log(`[POST /api/jobs] Done: ${upserted} upserted, ${errors} errors in ${durationMs}ms`);

    return NextResponse.json({
      success: true,
      message: `Synced ${upserted} jobs (${errors} errors) in ${durationMs}ms`,
      upserted,
      errors,
      total: rawJobs.length,
      durationMs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/jobs/sync] Fatal:", msg);
    return NextResponse.json(
      { success: false, error: `Sync failed: ${msg}` },
      { status: 500 }
    );
  }
}