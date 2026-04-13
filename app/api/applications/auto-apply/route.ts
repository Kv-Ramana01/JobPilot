// app/api/applications/auto-apply/route.ts
// Triggers Playwright auto-fill for a job application
// Only works server-side in Node.js environment (not Edge runtime)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { autoApply } from "@/services/playwright-apply";
import { ApplyMode, ApplicationStatus } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs"; // Required — Playwright needs Node.js

const schema = z.object({
  jobId: z.string(),
  resumeId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { clerkId },
    include: {
      profile: true,
      resumes: true,
    },
  });
  if (!user || !user.profile) {
    return NextResponse.json(
      { error: "Please complete your profile before using auto-apply" },
      { status: 400 }
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { jobId, resumeId } = parsed.data;

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Find resume URL if provided
  let resumeUrl: string | undefined;
  if (resumeId) {
    const resume = await db.resume.findFirst({
      where: { id: resumeId, userId: user.id },
    });
    resumeUrl = resume?.fileUrl;
  }

  // Run auto-apply
  const result = await autoApply({
    jobId,
    applyUrl: job.sourceUrl,
    profile: user.profile,
    resumeUrl,
  });

  // Track the application regardless of mode
  await db.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    create: {
      userId: user.id,
      jobId,
      status: ApplicationStatus.APPLIED,
      applyMode: result.mode === "autofill" ? ApplyMode.AUTO_FILL : ApplyMode.DIRECT_LINK,
      resumeId,
      appliedAt: new Date(),
      timeline: [{ event: "Applied", mode: result.mode, at: new Date().toISOString() }],
    },
    update: {
      status: ApplicationStatus.APPLIED,
      applyMode: result.mode === "autofill" ? ApplyMode.AUTO_FILL : ApplyMode.DIRECT_LINK,
      appliedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Increment job apply count
  await db.job.update({
    where: { id: jobId },
    data: { applyCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true, data: result });
}
