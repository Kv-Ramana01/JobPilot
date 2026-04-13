// app/api/cron/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aggregateJobs } from "@/services/job-aggregator";
import { sendJobAlertEmail } from "@/services/email";
import { formatSalary } from "@/lib/utils";
import { AlertFrequency, Prisma } from "@prisma/client";

function verifySecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In dev mode without CRON_SECRET set, allow all requests
  if (!cronSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  return auth === `Bearer ${cronSecret}`;
}

// ─── POST /api/cron?task=sync|alerts ─────────────────────────────

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = req.nextUrl.searchParams.get("task") ?? "sync";

  if (task === "sync") {
    return runJobSync();
  }

  if (task === "alerts") {
    return runAlertEmails();
  }

  return NextResponse.json({ error: "Unknown task. Use ?task=sync or ?task=alerts" }, { status: 400 });
}

// Allow GET requests too (easier to trigger manually in browser during dev)
export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = req.nextUrl.searchParams.get("task") ?? "sync";

  if (task === "sync") {
    return runJobSync();
  }

  if (task === "alerts") {
    return runAlertEmails();
  }

  return NextResponse.json({ error: "Unknown task" }, { status: 400 });
}

// ─── Job sync ─────────────────────────────────────────────────────

async function runJobSync() {
  const startTime = Date.now();
  console.log("[cron/sync] Starting job sync...");

  try {
    const rawJobs = await aggregateJobs();
    console.log(`[cron/sync] Aggregated ${rawJobs.length} raw jobs`);

    if (rawJobs.length === 0) {
      return NextResponse.json({
        success: true,
        task: "sync",
        upserted: 0,
        errors: 0,
        message: "No jobs returned from any source. Check API credentials and logs.",
        durationMs: Date.now() - startTime,
      });
    }

    let upserted = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const job of rawJobs) {
      try {
        // Validate required fields
        if (!job.externalId || !job.source || !job.title || !job.company) {
          console.warn("[cron/sync] Skipping job with missing required fields:", {
            externalId: job.externalId,
            source: job.source,
            title: job.title?.slice(0, 50),
          });
          errors++;
          continue;
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
            benefits: [],
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
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cron/sync] Failed to upsert job ${job.externalId}:`, msg);
        if (errorMessages.length < 5) {
          errorMessages.push(`${job.externalId}: ${msg}`);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[cron/sync] Done: ${upserted} upserted, ${errors} errors in ${duration}ms`);

    return NextResponse.json({
      success: true,
      task: "sync",
      upserted,
      errors,
      total: rawJobs.length,
      durationMs: duration,
      ...(errorMessages.length > 0 ? { sampleErrors: errorMessages } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/sync] Fatal error:", msg);
    return NextResponse.json({ success: false, error: `Sync failed: ${msg}` }, { status: 500 });
  }
}

// ─── Alert emails ─────────────────────────────────────────────────

async function runAlertEmails() {
  console.log("[cron/alerts] Starting alert emails...");
  const now = new Date();

  try {
    const alerts = await db.alert.findMany({
      where: {
        isActive: true,
        emailEnabled: true,
        OR: [
          {
            frequency: AlertFrequency.DAILY,
            lastSentAt: { lt: new Date(now.getTime() - 23 * 3600 * 1000) },
          },
          {
            frequency: AlertFrequency.WEEKLY,
            lastSentAt: { lt: new Date(now.getTime() - 6 * 24 * 3600 * 1000) },
          },
          { frequency: AlertFrequency.DAILY, lastSentAt: null },
          { frequency: AlertFrequency.WEEKLY, lastSentAt: null },
        ],
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    console.log(`[cron/alerts] Found ${alerts.length} alerts due`);

    let sent = 0;
    let skipped = 0;

    for (const alert of alerts) {
      try {
        const cutoff = alert.lastSentAt ?? new Date(now.getTime() - 24 * 3600 * 1000);

        const whereClause: Prisma.JobWhereInput = {
          isActive: true,
          postedAt: { gte: cutoff },
          ...(alert.remote ? { isRemote: true } : {}),
          ...(alert.keywords.length > 0
            ? {
                OR: alert.keywords.map((kw) => ({
                  OR: [
                    { title: { contains: kw, mode: "insensitive" as const } },
                    { description: { contains: kw, mode: "insensitive" as const } },
                    { skills: { has: kw } },
                  ],
                })),
              }
            : {}),
          ...(alert.jobTypes.length > 0 ? { jobType: { in: alert.jobTypes } } : {}),
          ...(alert.workTypes.length > 0 ? { workType: { in: alert.workTypes } } : {}),
          ...(alert.countries.length > 0 ? { country: { in: alert.countries } } : {}),
          ...(alert.minSalary ? { salaryMax: { gte: alert.minSalary } } : {}),
        };

        const matchingJobs = await db.job.findMany({
          where: whereClause,
          take: 15,
          orderBy: { postedAt: "desc" },
        });

        if (matchingJobs.length === 0) {
          console.log(`[cron/alerts] Alert "${alert.name}" — no matching jobs, skipping`);
          skipped++;
          continue;
        }

        if (!process.env.RESEND_API_KEY) {
          console.warn("[cron/alerts] RESEND_API_KEY not set — skipping email send");
          skipped++;
          continue;
        }

        await sendJobAlertEmail({
          to: alert.user.email,
          userName: alert.user.profile?.fullName ?? alert.user.email.split("@")[0],
          alertName: alert.name,
          jobs: matchingJobs.map((j) => ({
            title: j.title,
            company: j.company,
            location: j.location ?? "Remote",
            url: `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${j.id}`,
            salary:
              j.salaryMin || j.salaryMax
                ? formatSalary(j.salaryMin, j.salaryMax, j.currency ?? "USD")
                : undefined,
            isRemote: j.isRemote,
          })),
        });

        await db.alert.update({
          where: { id: alert.id },
          data: { lastSentAt: now },
        });

        sent++;
        console.log(`[cron/alerts] Sent "${alert.name}" to ${alert.user.email} (${matchingJobs.length} jobs)`);
      } catch (err) {
        console.error(`[cron/alerts] Alert ${alert.id} failed:`, err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({
      success: true,
      task: "alerts",
      sent,
      skipped,
      total: alerts.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/alerts] Fatal error:", msg);
    return NextResponse.json({ success: false, error: `Alerts failed: ${msg}` }, { status: 500 });
  }
}