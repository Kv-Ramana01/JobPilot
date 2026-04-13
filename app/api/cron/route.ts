// app/api/cron/route.ts
// Called by Vercel Cron or an external scheduler (Railway, etc.)
// Schedule: */30 * * * * (every 30 minutes for job sync)
//           0 8 * * *    (daily at 8am for alert emails)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aggregateJobs } from "@/services/job-aggregator";
import { sendJobAlertEmail } from "@/services/email";
import { formatSalary } from "@/lib/utils";
import { AlertFrequency } from "@prisma/client";

function verifySecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
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

  return NextResponse.json({ error: "Unknown task" }, { status: 400 });
}

// ─── Job sync ─────────────────────────────────────────────────────

async function runJobSync() {
  try {
    const rawJobs = await aggregateJobs();
    let upserted = 0;

    for (const job of rawJobs) {
      await db.job
        .upsert({
          where: { externalId_source: { externalId: job.externalId, source: job.source } },
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
            visaSponsorship: job.visaSponsorship ?? false,
            experienceLevel: job.experienceLevel,
            benefits: [],
            isActive: true,
          },
          update: { isActive: true, updatedAt: new Date() },
        })
        .then(() => upserted++)
        .catch(() => {});
    }

    return NextResponse.json({ success: true, task: "sync", upserted });
  } catch (err) {
    console.error("[cron/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

// ─── Alert emails ─────────────────────────────────────────────────

async function runAlertEmails() {
  const now = new Date();

  // Fetch active alerts due for sending
  const alerts = await db.alert.findMany({
    where: {
      isActive: true,
      emailEnabled: true,
      OR: [
        { frequency: AlertFrequency.DAILY, lastSentAt: { lt: new Date(now.getTime() - 23 * 3600 * 1000) } },
        { frequency: AlertFrequency.WEEKLY, lastSentAt: { lt: new Date(now.getTime() - 6 * 24 * 3600 * 1000) } },
        { frequency: AlertFrequency.DAILY, lastSentAt: null },
        { frequency: AlertFrequency.WEEKLY, lastSentAt: null },
      ],
    },
    include: {
      user: { include: { profile: true } },
    },
  });

  let sent = 0;

  for (const alert of alerts) {
    try {
      // Match jobs against alert criteria
      const cutoff = alert.lastSentAt ?? new Date(now.getTime() - 24 * 3600 * 1000);

      const matchingJobs = await db.job.findMany({
        where: {
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
        },
        take: 15,
        orderBy: { postedAt: "desc" },
      });

      if (matchingJobs.length === 0) continue;

      await sendJobAlertEmail({
        to: alert.user.email,
        userName: alert.user.profile?.fullName ?? alert.user.email.split("@")[0],
        alertName: alert.name,
        jobs: matchingJobs.map((j) => ({
          title: j.title,
          company: j.company,
          location: j.location ?? "Remote",
          url: `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${j.id}`,
          salary: j.salaryMin || j.salaryMax
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
    } catch (err) {
      console.error(`[cron/alerts] Alert ${alert.id} failed:`, err);
    }
  }

  return NextResponse.json({ success: true, task: "alerts", sent });
}
